// Broker abstraction layer
// Switch between different exchanges and brokers

import { RobinhoodBroker } from './robinhood.js';

class BrokerFactory {
  static create(chain, config) {
    switch (chain) {
      case 'robinhood':
        return new RobinhoodBroker(config.rpcUrl, config.privateKey);
      case 'solana':
        return new SolanaBroker(config.rpcUrl, config.privateKey);
      case 'ethereum':
        return new EthereumBroker(config.rpcUrl, config.privateKey);
      default:
        throw new Error(`Unknown chain: ${chain}`);
    }
  }
}

export { BrokerFactory };
