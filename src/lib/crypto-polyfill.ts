import crypto from 'crypto';

// Extend the crypto type to include SHA224
declare module 'crypto' {
  interface Crypto {
    SHA224: any;
  }
}

// Polyfill for crypto.SHA224
if (!crypto.SHA224) {
  crypto.SHA224 = crypto.createHash('sha224');
}

// Export the polyfilled crypto
export default crypto; 