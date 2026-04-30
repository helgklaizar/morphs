"""
CronMorph — Watchdog/Healthcheck + Cron scheduler (Task 26).

Allows agents to:
  - sleep for N seconds (saving CPU/tokens)
  - run an HTTP healthcheck without getting stuck in an infinite loop
  - schedule recurring tasks via a cron schedule
"""

import asyncio
import time
from typing import Callable, Awaitable, Optional
from dataclasses import dataclass, field
from core.logger import logger
from core.event_bus import bus


# ---------------------------------------------------------------------------
# Healthcheck
# ---------------------------------------------------------------------------

@dataclass
class HealthcheckResult:
    url: str
    ok: bool
    status_code: int = 0
    latency_ms: float = 0.0
    error: str = ""

    def __str__(self) -> str:
        if self.ok:
            return f"✅ {self.url} → {self.status_code} ({self.latency_ms:.0f}ms)"
        return f"❌ {self.url} → {self.error}"


async def ping_url(url: str, timeout: float = 5.0) -> HealthcheckResult:
    """A minimal async HTTP ping that doesn't block."""
    import aiohttp
    start = time.perf_counter()
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
                latency = (time.perf_counter() - start) * 1000
                return HealthcheckResult(
                    url=url,
                    ok=resp.status < 500,
                    status_code=resp.status,
                    latency_ms=latency,
                )
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000
        return HealthcheckResult(url=url, ok=False, latency_ms=latency, error=str(e))


# ---------------------------------------------------------------------------
# CronJob
# ---------------------------------------------------------------------------

@dataclass
class CronJob:
    name: str
    interval_seconds: int
    coro_factory: Callable[[], Awaitable[None]]
    last_run: float = field(default_factory=lambda: 0.0)
    run_count: int = 0
    enabled: bool = True


class CronMorph:
    """
    Task scheduler for sub-agents (Watchdog style).
    Avoids infinite polling loops by using sleep-between-checks.
    """

    def __init__(self):
        self._jobs: dict[str, CronJob] = {}
        self._running = False
        self._tick_interval = 1  # seconds

    def register(
        self,
        name: str,
        interval_seconds: int,
        coro_factory: Callable[[], Awaitable[None]],
    ) -> None:
        """Registers a new periodic job."""
        self._jobs[name] = CronJob(
            name=name,
            interval_seconds=interval_seconds,
            coro_factory=coro_factory,
        )
        logger.info(f"🕰️ [CronMorph] Job '{name}' registered (every {interval_seconds}s)")

    def unregister(self, name: str) -> None:
        """Removes a job."""
        self._jobs.pop(name, None)
        logger.info(f"🗑️ [CronMorph] Job '{name}' unscheduled")

    async def run(self, max_seconds: Optional[int] = None) -> None:
        """Main async loop with a proper sleep between ticks (not spinning!)."""
        self._running = True
        start = time.time()
        logger.info("⏱️ [CronMorph] Scheduler started.")

        while self._running:
            now = time.time()

            for job in list(self._jobs.values()):
                if not job.enabled:
                    continue
                if (now - job.last_run) >= job.interval_seconds:
                    try:
                        logger.info(f"▶️ [CronMorph] Running '{job.name}' (Run #{job.run_count + 1})")
                        await job.coro_factory()
                        job.run_count += 1
                        job.last_run = time.time()
                    except Exception as e:
                        logger.error(f"🔥 [CronMorph] Error in job '{job.name}': {e}", exc_info=True)

            if max_seconds is not None and (now - start) >= max_seconds:
                logger.info(f"⏱️ [CronMorph] Limit of {max_seconds}s reached — stopping.")
                break
            # Proper sleep — not wasting CPU/tokens
            await asyncio.sleep(self._tick_interval)

        self._running = False
        logger.info("⏹️ [CronMorph] Scheduler stopped.")

    def stop(self) -> None:
        self._running = False


# ---------------------------------------------------------------------------
# WatchdogMorph — Healthcheck agent with a sleep primitive
# ---------------------------------------------------------------------------

class WatchdogMorph:
    """
    Watchdog agent.
    Checks server status with pauses via the CronMorph scheduler.
    Publishes an event to the EventBus upon detecting a failure.
    """

    def __init__(
        self,
        targets: list[str],
        check_interval: int = 30,
        alert_topic: str = "swarm.watchdog.alert",
    ):
        self.targets = targets
        self.check_interval = check_interval
        self.alert_topic = alert_topic
        self._cron = CronMorph()
        self._cron.register("healthcheck", check_interval, self._run_checks)

    async def _run_checks(self) -> None:
        logger.info(f"🔍 [WatchdogMorph] Healthchecking {len(self.targets)} servers...")
        tasks = [ping_url(url) for url in self.targets]
        results: list[HealthcheckResult] = await asyncio.gather(*tasks)

        for r in results:
            logger.info(f"   {r}")
            if not r.ok:
                try:
                    await bus.publish(self.alert_topic, {
                        "url": r.url,
                        "error": r.error,
                        "status_code": r.status_code,
                    })
                    logger.warning(f"🚨 [WatchdogMorph] Alert published: {r.url} is DOWN!")
                except Exception as e:
                    logger.error(f"⚠️ [WatchdogMorph] Failed to publish alert: {e}")

    async def watch(self, duration_seconds: Optional[int] = None) -> None:
        """Starts continuous monitoring with a proper sleep between checks."""
        await self._cron.run(max_seconds=duration_seconds)

    def stop(self) -> None:
        self._cron.stop()


# ---------------------------------------------------------------------------
# Standalone async sleep helper (for the AgentTools.sleep_agent tool)
# ---------------------------------------------------------------------------

async def agent_sleep(seconds: int, agent_id: str = "unknown") -> None:
    """A proper async sleep for agents — does not block the event loop."""
    logger.info(f"💤 [CronMorph] Agent {agent_id} is going to sleep for {seconds}s...")
    await asyncio.sleep(seconds)
    logger.info(f"⏰ [CronMorph] Agent {agent_id} woke up!")
