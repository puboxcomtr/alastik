const soap = require('soap');

const WSDL = 'https://otopirpossv2.netahsilatservice.com/VendorPayment/VendorPaymentService.svc?wsdl';
const AUTH = { 
  UserName: 'servis2@artvinticaret.com.tr', 
  Password: 'ByAdmpws1526+' 
};

async function testPayment() {
  const client = await soap.createClientAsync(WSDL);
  
  // XML logla
  client.on('request', (xml) => {
    console.log('=== REQUEST XML ===');
    console.log(xml);
  });
  
  const request = {
    authInfo: AUTH,
    paymentParameters: {
      Amount: 1.00,
      Installment: 1,
      VirtualPosId: 3,
      ClientReferenceCode: 'TEST_' + Date.now(),
      Description: 'Test odeme',
      UseSafeKey: false,
      CreditCard: {
        CardNumber: '4553597047506249',
        CardHolderName: 'TEST USER',
        ExpMonth: 4,
        ExpYear: 2028,
        CvcNumber: '419',
        Email: 'test@test.com',
        Phone: '5551234567',
        SaveCreditCard: false
      }
    }
  };

  try {
    const [result] = await client.SaleAsync(request);
    console.log('\n=== RESPONSE ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  }
}

testPayment();
