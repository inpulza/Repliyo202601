import { createMetricoolService } from './server/services/metricool';

async function testTikTok() {
  try {
    const service = createMetricoolService();
    const blogId = '4074962'; // Impulsa
    
    console.log('🔍 Llamando a API de Metricool para TikTok Business...');
    console.log('BlogId:', blogId);
    console.log('Provider: TIKTOKBUSINESS');
    console.log('---\n');
    
    const comments = await service.getComments(blogId, 'TIKTOKBUSINESS');
    
    console.log('📦 RESPUESTA DE TIKTOK BUSINESS:');
    console.log('Total comentarios encontrados:', comments.length);
    console.log('\n');
    
    if (comments.length > 0) {
      console.log('✅ PRIMER COMENTARIO (estructura completa):');
      console.log(JSON.stringify(comments[0].rawData, null, 2));
      console.log('\n');
      console.log('📋 DATOS MAPEADOS:');
      console.log('- ID:', comments[0].id);
      console.log('- Provider:', comments[0].provider);
      console.log('- Autor:', comments[0].author);
      console.log('- Avatar:', comments[0].authorAvatar);
      console.log('- Contenido:', comments[0].content);
      console.log('- Timestamp:', comments[0].timestamp);
      console.log('- Post URL:', comments[0].postUrl);
    } else {
      console.log('⚠️  No hay comentarios de TikTok Business para esta marca');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testTikTok();
