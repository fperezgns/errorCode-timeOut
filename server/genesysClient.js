// Inicializa el SDK de Genesys Cloud para Node con Client Credentials
// import { ApiClient, AnalyticsApi, UsersApi, RoutingApi } from 'purecloud-platform-client-v2';
const platformClient = require('purecloud-platform-client-v2');
const env = process.env;

const envMap = {
  us_east_1: 'mypurecloud.com',
  eu_west_1: 'mypurecloud.ie',
  ap_southeast_2: 'mypurecloud.com.au',
  sa_east_1: 'mypurecloud.com.br',
  eu_central_1: 'mypurecloud.de',
  ap_northeast_1: 'mypurecloud.jp',
  ca_central_1: 'cac1.pure.cloud',
  ap_south_1: 'aps1.pure.cloud',
  us_west_2: 'usw2.pure.cloud',
  us_east_1_aws: 'use1.pure.cloud'
};

const apiClient = platformClient.ApiClient.instance;
const analyticsApi = new platformClient.AnalyticsApi();
const usersApi = new platformClient.UsersApi();
const routingApi = new platformClient.RoutingApi();

async function initGenesys() {
  const region = envMap[(env.REGION || 'us_east_1')] || envMap.us_east_1;
  apiClient.setEnvironment(region);
  await apiClient.loginClientCredentialsGrant(env.CLIENT_ID, env.CLIENT_SECRET);
  return { analyticsApi, usersApi, routingApi };
}

module.exports = { initGenesys };
