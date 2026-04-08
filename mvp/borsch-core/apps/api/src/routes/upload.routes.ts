import { Hono } from 'hono';
import * as fs from 'fs';
import * as path from 'path';

const router = new Hono();

router.post('/', async (c) => {
  const body = await c.req.parseBody();
  const file = body['image'];
  if (file instanceof File) {
      const buffer = await file.arrayBuffer();
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      fs.writeFileSync(path.join(uploadDir, fileName), Buffer.from(buffer));
      return c.json({ imageUrl: `/uploads/${fileName}` });
  }
  return c.json({ error: 'No valid image uploaded' }, 400);
});

export default router;
