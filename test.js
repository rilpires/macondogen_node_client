const macondo = require('./client.js');

macondo.connect({
  host: 'localhost',
  port: 7776
});


macondo.on('connected', () => {
  console.log('Connected');
});


setImmediate(async () => {
  console.log(await macondo.LIST_AGENTS());
  console.log(await macondo.DESCRIBE_AGENT(0));
  console.log(await macondo.PROCEED(1));
  console.log(await macondo.POP_EVENT(2222));
  // console.log(await macondo.JSON("{}"));
});