// Notification Service for WEARNWALK
// Handles SMS and WhatsApp notifications via Twilio API

class NotificationService {
  constructor() {
    // Twilio configuration - Replace with your actual credentials
    this.config = {
      accountSid: 'ACb54c1f9d709b6b3e672565e32f58e4fe', // Your Twilio Account SID
      authToken: 'f8f1e3b9a92e3c1f9f6041bc59cd00fd',         // Your Twilio Auth Token
      twilioNumber: '(812) 567-0819',        // Your Twilio phone number
      businessNumber: '8252546667',          // Your business WhatsApp number
      // WhatsApp configuration
      whatsappEnabled: true,
      smsEnabled: true
    };
    
    this.twilio = null;
    this.initTwilio();
  }

  initTwilio() {
    // Initialize Twilio client
    if (typeof twilio !== 'undefined') {
      this.twilio = new twilio(this.config.accountSid, this.config.authToken);
    } else {
      console.warn('Twilio library not loaded. Please include Twilio SDK.');
    }
  }

  // Send SMS notification
  async sendSMS(to, message) {
    if (!this.config.smsEnabled || !this.twilio) {
      console.warn('SMS not enabled or Twilio not initialized');
      return { success: false, error: 'SMS not enabled' };
    }

    try {
      const result = await this.twilio.messages.create({
        body: message,
        from: this.config.twilioNumber,
        to: to
      });

      console.log('SMS sent successfully:', result.sid);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send WhatsApp notification
  async sendWhatsApp(to, message) {
    if (!this.config.whatsappEnabled || !this.twilio) {
      console.warn('WhatsApp not enabled or Twilio not initialized');
      return { success: false, error: 'WhatsApp not enabled' };
    }

    try {
      const result = await this.twilio.messages.create({
        body: message,
        from: `whatsapp:${this.config.twilioNumber}`,
        to: `whatsapp:${to}`
      });

      console.log('WhatsApp message sent successfully:', result.sid);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('WhatsApp sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Format bill message
  formatBillMessage(orderDetails) {
    const { customerName, billNo, date, total, paymentMethod, shopName } = orderDetails;
    
    return `🛍 *${shopName || 'WEARNWALK'}* - Order Confirmation

📋 Bill Details:
• Bill No: ${billNo}
• Date: ${new Date(date).toLocaleDateString()}
• Total: ₹${total.toFixed(2)}
• Payment: ${paymentMethod}

📦 Thank you for shopping with us!
📞 For queries: ${this.config.businessNumber}

View your bill: [Download Link]`;
  }

  // Send order confirmation (both SMS and WhatsApp)
  async sendOrderConfirmation(customerPhone, orderDetails) {
    const message = this.formatBillMessage(orderDetails);
    const results = [];

    // Send SMS
    if (customerPhone && this.config.smsEnabled) {
      const smsResult = await this.sendSMS(customerPhone, message);
      results.push({ type: 'SMS', ...smsResult });
    }

    // Send WhatsApp (if phone is WhatsApp enabled)
    if (customerPhone && this.config.whatsappEnabled) {
      const whatsappResult = await this.sendWhatsApp(customerPhone, message);
      results.push({ type: 'WhatsApp', ...whatsappResult });
    }

    return results;
  }

  // Validate phone number
  validatePhoneNumber(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig() {
    return this.config;
  }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationService;
} else {
  window.NotificationService = NotificationService;
}
