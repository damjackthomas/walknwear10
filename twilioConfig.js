// Twilio Configuration for WEARNWALK
// Replace these values with your actual Twilio credentials

const TWILIO_CONFIG = {
  // Get these from your Twilio Console: https://console.twilio.com/
  accountSid: 'ACb54c1f9d709b6b3e672565e32f58e4fe',  // Your Account SID
  authToken: 'f8f1e3b9a92e3c1f9f6041bc59cd00fd',             // Your Auth Token
  twilioNumber: '(812) 567-0819',              // Your Twilio phone number
  
  // Business settings
  businessNumber: '8252546667',              // Your business WhatsApp number
  businessName: 'WEARNWALK',                   // Your business name
  
  // Notification settings
  smsEnabled: true,                              // Enable SMS notifications
  whatsappEnabled: true,                          // Enable WhatsApp notifications
  
  // Message templates
  templates: {
    orderConfirmation: `🛍 *{shopName}* - Order Confirmation

📋 Bill Details:
• Bill No: {billNo}
• Date: {date}
• Total: ₹{total}
• Payment: {paymentMethod}

📦 Thank you for shopping with us!
📞 For queries: {businessNumber}

View your bill: {billLink}`,
    
    paymentReceived: `💰 Payment Received - {shopName}
Amount: ₹{amount}
Order: {billNo}
Thank you for your payment!`,
    
    deliveryUpdate: `🚚 Delivery Update - {shopName}
Order: {billNo}
Status: {status}
{message}`
  }
};

// For development/demo purposes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TWILIO_CONFIG;
} else {
  window.TWILIO_CONFIG = TWILIO_CONFIG;
}
