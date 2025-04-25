function processPayment(imagePath, callback) {
    setTimeout(() => {
        const success = true;
        if (success) {
            callback(null, { message: 'Payment successful!', imagePath });
        } else {
            callback(new Error('Payment failed!'));
        }
    }, 2000);
}

module.exports = { processPayment };