"""
CronMorph — Watchdog/Healthcheck + Cron-планировщик (Задача 26).

Позволяет агентам:
  - засыпать на N секунд (экономия CPU/токенов)
  - запускать healthcheck по HTTP без зависания в вечном цикле
  - планировать повторяющиеся задачи через cron-расписание
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
    """Минимальный async HTTP-пинг без зависания."""
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
    Планировщик задач для субагентов (Watchdog style).
    Исключает вечные циклы опроса через sleep-between-checks.
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
        """Регистрация нового периодического задания."""
        self._jobs[name] = CronJob(
            name=name,
            interval_seconds=interval_seconds,
            coro_factory=coro_factory,
        )
        logger.info(f"🕰️ [CronMorph] Задание '{name}' зарегистрировано (каждые {interval_seconds}s)")

    def unregister(self, name: str) -> None:
        """Удаление задания."""
        self._jobs.pop(name, None)
        logger.info(f"🗑️ [CronMorph] Задание '{name}' снято с расписания")

    async def run(self, max_seconds: Optional[int] = None) -> None:
        """Main async loop с честным sleep между тиками (не spinning!)."""
        self._running = True
        start = time.time()
        logger.info("⏱️ [CronMorph] Планировщик запущен.")

        while self._running:
            now = time.time()

            for job in list(self._jobs.values()):
                if not job.enabled:
                    continue
                if (now - job.last_run) >= job.interval_seconds:
                    try:
                        logger.info(f"▶️ [CronMorph] Запуск '{job.name}' (Zapusk #{job.run_count + 1})")
                        await job.coro_factory()
                        job.run_count += 1
                        job.last_run = time.time()
                    except Exception as e:
                        logger.error(f"🔥 [CronMorph] Ошибка в задании '{job.name}': {e}", exc_info=True)

            if max_seconds is not None and (now - start) >= max_seconds:
                logger.info(f"⏱️ [CronMorph] Лимит {max_seconds}s истёк — останавливаемся.")
                break
            # Честный sleep — не занимаем CPU/токены впустую
            await asyncio.sleep(self._tick_interval)

        self._running = False
        logger.info("⏹️ [CronMorph] Планировщик остановлен.")

    def stop(self) -> None:
        self._running = False


# ---------------------------------------------------------------------------
# WatchdogMorph — Healthcheck-агент с sleep примитивом
# ---------------------------------------------------------------------------

class WatchdogMorph:
    """
    Сторожевой агент (Watchdog).
    Проверяет статус серверов с паузами через CronMorph.sleep().
    При обнаружении сбоя — публикует событие в EventBus.
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
        logger.info(f"🔍 [WatchdogMorph] Healthcheck {len(self.targets)} серверов...")
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
                    logger.error(f"⚠️ [WatchdogMorph] Не удалось опубликовать alert: {e}")

    async def watch(self, duration_seconds: Optional[int] = None) -> None:
        """Запускает непрерывный мониторинг с честным sleep между проверками."""
        await self._cron.run(max_seconds=duration_seconds)

    def stop(self) -> None:
        self._cron.stop()


# ---------------------------------------------------------------------------
# Standalone async sleep helper (для тулза AgentTools.sleep_agent)
# ---------------------------------------------------------------------------

async def agent_sleep(seconds: int, agent_id: str = "unknown") -> None:
    """Честный async sleep для агентов — не блокирует event loop."""
    logger.info(f"💤 [CronMorph] Агент {agent_id} засыпает на {seconds}s...")
    await asyncio.sleep(seconds)
    logger.info(f"⏰ [CronMorph] Агент {agent_id} проснулся!")
