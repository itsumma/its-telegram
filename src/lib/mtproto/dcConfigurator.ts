import MTTransport from './transports/transport';
import { Modes } from './mtproto_config';

/// #if !MTPROTO_HTTP
import Socket from './transports/websocket';
// @ts-ignore
type TransportTypes = 'websocket';
/// #else 
import HTTP from './transports/http';
// @ts-ignore
type TransportTypes = 'https' | 'http';
/// #endif
type Servers = {
  [transportType in TransportTypes]: {
    [dcID: number]: MTTransport[]
  }
};

export class DcConfigurator {
  private sslSubdomains = ['pluto', 'venus', 'aurora', 'vesta', 'flora'];

  private dcOptions = Modes.test
    ? [
      {id: 1, host: '149.154.175.10',  port: 80},
      {id: 2, host: '149.154.167.40',  port: 80},
      {id: 3, host: '149.154.175.117', port: 80}
    ]
    : [
      {id: 1, host: '149.154.175.50',  port: 80},
      {id: 2, host: '149.154.167.50',  port: 80},
      {id: 3, host: '149.154.175.100', port: 80},
      {id: 4, host: '149.154.167.91',  port: 80},
      {id: 5, host: '149.154.171.5',   port: 80}
    ];

  /// #if !MTPROTO_HTTP
  private chosenServers: Servers = {
    websocket: {}
  };

  private chosenUploadServers: Servers = {
    websocket: {}
  };

  /// #else
  // @ts-ignore
  private chosenServers: Servers = {
    // @ts-ignore
    https: {},
    http: {}
  };

  // @ts-ignore
  private chosenUploadServers: Servers = {
    // @ts-ignore
    https: {},
    http: {}
  };
  /// #endif

  public chooseServer(dcID: number, upload?: boolean, transportType: TransportTypes = 'websocket') {
    const servers = upload && (transportType != 'websocket' || Modes.multipleConnections) 
      ? this.chosenUploadServers[transportType] 
      : this.chosenServers[transportType];

    if(!(dcID in servers)) {
      servers[dcID] = [];
    }

    const transports = servers[dcID];

    if(!transports.length || (upload && transports.length < 1)) {
      let transport: MTTransport;

      /// #if !MTPROTO_HTTP
      //if(transportType == 'websocket') {
        const subdomain = this.sslSubdomains[dcID - 1];
        const path = Modes.test ? 'apiws_test' : 'apiws';
        const chosenServer = 'wss://' + subdomain + '.web.telegram.org/' + path;
        transport = new Socket(dcID, chosenServer);
      //} else 
      /// #else
      // @ts-ignore
      if(Modes.ssl || !Modes.http || transportType == 'https') {
        const subdomain = this.sslSubdomains[dcID - 1] + (upload ? '-1' : '');
        const path = Modes.test ? 'apiw_test1' : 'apiw1';
        const chosenServer = 'https://' + subdomain + '.web.telegram.org/' + path;
        transport = new HTTP(dcID, chosenServer);
      } else {
        for(let dcOption of this.dcOptions) {
          if(dcOption.id == dcID) {
            const chosenServer = 'http://' + dcOption.host + (dcOption.port != 80 ? ':' + dcOption.port : '') + '/apiw1';
            transport = new HTTP(dcID, chosenServer);
            break;
          }
        }
      }
      /// #endif
  
      if(!transport) {
        console.error('No chosenServer!', dcID);
        return null;
      }
      
      transports.push(transport);
      return transport;
    }
  
    return transports[0];
  }
}

export default new DcConfigurator();
