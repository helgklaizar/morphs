import asyncio
import msgspec
import redis.asyncio as aioredis
from core.logger import logger

class SwarmEventBus:
    """
    (Пункт 2: P2P Swarm Topology / Децентрализованный Рой)
    Кластерная AGI Операционная Система!
    Брокер сообщений на базе Redis.
    Используем msgspec для бешеной скорости сериализации!
    """
    def __init__(self, redis_url: str = "redis://localhost"):
        self.subscribers = {}
        self.redis_url = redis_url
        self.redis = None
        self.pubsub = None
        self.is_p2p = False
        self._listener_task = None
        
    async def connect(self):
        self.redis = await aioredis.from_url(self.redis_url)
        await self.redis.ping()
        self.pubsub = self.redis.pubsub()
        self.is_p2p = True
        logger.info("🌐 [EventBus P2P] Успешно подключен к реальному Redis!")
        
        self._listener_task = asyncio.create_task(self._listen_redis())

    async def _listen_redis(self):
        while True:
            try:
                message = await self.pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message['type'] == 'message':
                    topic = message['channel'].decode('utf-8')
                    # x10 скорость парсинга с msgspec
                    payload = msgspec.json.decode(message['data'])
                    
                    if topic in self.subscribers:
                        tasks = [asyncio.create_task(h(payload)) for h in self.subscribers[topic]]
                        await asyncio.gather(*tasks)
            except Exception as e:
                logger.error(f"🔥 [EventBus P2P] Ошибка прослушивания: {e}", exc_info=True)
                await asyncio.sleep(2)

    async def subscribe(self, topic: str, handler):
        if topic not in self.subscribers:
            self.subscribers[topic] = []
            
            # Подписываемся на P2P канал
            if self.is_p2p and self.pubsub:
                await self.pubsub.subscribe(topic)
                
        self.subscribers[topic].append(handler)
        logger.info(f"👂 [EventBus] Агент подписан на топик '{topic}'")

    async def publish(self, topic: str, payload: dict):
        encoded = msgspec.json.encode(payload)
        logger.info(f"📢 [EventBus] Бродкаст в '{topic}': {encoded.decode('utf-8')[:70]}...")
        
        if self.is_p2p and self.redis:
            await self.redis.publish(topic, encoded)

# Global Instance
bus = SwarmEventBus()

async def demo_ui_morph(payload):
    logger.info(f"🎨 [UI-Morph] Услышал о новом роутере: {payload.get('router_path')}.")

async def test_bus():
    await bus.connect()
    await bus.subscribe("router.generated", demo_ui_morph)
    await bus.publish("router.generated", {"router_path": "routers/store.py", "status": "o1-reviewed"})
    await asyncio.sleep(1) # Ждем обработки P2P

if __name__ == "__main__":
    asyncio.run(test_bus())
