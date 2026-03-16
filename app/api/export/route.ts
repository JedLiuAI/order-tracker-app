export const dynamic = "force-dynamic";
import { exportOrdersAction } from '@/app/actions';

export async function POST(request: Request) {
  const formData = await request.formData();
  const { base64, fileName } = await exportOrdersAction(formData);
  const buffer = Buffer.from(base64, 'base64');
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`
    }
  });
}

