// Test script for incremental scraping
import fetch from 'node-fetch';

async function testScrapingEndpoint() {
  const baseUrl = 'http://localhost:5000';
  
  // First, we need to authenticate - using a test token or session
  // For testing, we'll use a direct API call with admin privileges
  
  console.log('Testing incremental scraping endpoint...\n');
  
  // Test URL - using a simple example page
  const testUrl = 'https://www.graefin-von-zeppelin.de/collections/stauden?page=1';
  
  try {
    // Test 1: Start scraping with database saving
    console.log('Test 1: Starting scraping with database saving...');
    const response = await fetch(`${baseUrl}/api/admin/scrape-plant-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add authentication headers here
      },
      body: JSON.stringify({
        url: testUrl,
        saveToDatabase: true
      })
    });
    
    const result = await response.json();
    console.log('Scraping result:', result);
    
    // Test 2: Check scraping progress
    console.log('\nTest 2: Checking scraping progress...');
    const progressResponse = await fetch(`${baseUrl}/api/admin/scraping-progress?url=${encodeURIComponent(testUrl)}`, {
      headers: {
        // Add authentication headers
      }
    });
    
    const progress = await progressResponse.json();
    console.log('Progress:', progress);
    
    // Test 3: Verify plants were saved to database
    console.log('\nTest 3: Checking if plants were saved...');
    const plantsResponse = await fetch(`${baseUrl}/api/plants/search?query=`, {
      headers: {
        // Add authentication headers
      }
    });
    
    const plants = await plantsResponse.json();
    console.log(`Total plants in database: ${plants.length}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Note: This test requires authentication to work properly
console.log('Note: This test requires proper authentication to work.');
console.log('You can test manually through the admin interface or with a valid session.');
console.log('\nTo test manually:');
console.log('1. Go to the admin panel');
console.log('2. Navigate to plant import section');
console.log('3. Use the scraping tool with a test URL');
console.log('4. Check the database to confirm plants are being saved incrementally');