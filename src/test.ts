import * as macondo from './client'
const client = new macondo.MacondoClient();


client.connect({
  host: 'localhost',
  port: 7776
});

client.on('connected', () => {
  console.log('Connected');
});


setImmediate(async () => {
  console.log(await client.LIST_AGENTS());
  console.log(await client.DESCRIBE_AGENT(0));
  console.log(await client.PROCEED(1));
  console.log(await client.POP_EVENT(2222));
  // console.log(await client.JSON("{}"));
});