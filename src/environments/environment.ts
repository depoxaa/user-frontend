export const environment = {
    production: false,
    apiUrl: 'http://localhost:5278/api',
    // apiUrl: 'https://virtue-evaluating-veterans-sugar.trycloudflare.com/api',
    googlePay: {
        merchantId: 'YOUR_MERCHANT_ID',
        merchantName: 'Aganim Music',
        environment: 'TEST' as 'TEST' | 'PRODUCTION'
    }
};
