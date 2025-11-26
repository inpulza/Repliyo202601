import { createMetricoolService } from './services/metricool';

async function testMetricoolConnection() {
  console.log('🔍 Testing Metricool API connection...\n');
  
  try {
    const metricool = createMetricoolService();
    
    console.log('📡 Fetching brands from Metricool...');
    const brands = await metricool.getBrands();
    
    console.log(`\n✅ Successfully retrieved ${brands.length} brands:\n`);
    
    brands.forEach((brand, index) => {
      console.log(`${index + 1}. ${brand.name}`);
      console.log(`   Blog ID: ${brand.blogId}`);
      console.log(`   Avatar: ${brand.avatar || 'N/A'}`);
      console.log(`   URL: ${brand.url || 'N/A'}`);
      console.log('');
    });

    if (brands.length > 0) {
      const firstBrand = brands[0];
      console.log(`\n📨 Testing conversations for "${firstBrand.name}"...`);
      
      try {
        const conversations = await metricool.getConversations(firstBrand.blogId);
        console.log(`✅ Retrieved ${conversations.length} conversations`);
        
        if (conversations.length > 0) {
          console.log('\nSample conversation structure:');
          console.log(JSON.stringify(conversations[0], null, 2));
        }
      } catch (error: any) {
        console.log(`⚠️  Could not fetch conversations: ${error.message}`);
      }

      console.log(`\n💬 Testing comments for "${firstBrand.name}"...`);
      
      try {
        const comments = await metricool.getComments(firstBrand.blogId);
        console.log(`✅ Retrieved ${comments.length} comments`);
        
        if (comments.length > 0) {
          console.log('\nSample comment structure:');
          console.log(JSON.stringify(comments[0], null, 2));
        }
      } catch (error: any) {
        console.log(`⚠️  Could not fetch comments: ${error.message}`);
      }
    }

    console.log('\n✨ Metricool connection test completed successfully!\n');
  } catch (error: any) {
    console.error('\n❌ Error testing Metricool connection:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testMetricoolConnection();
