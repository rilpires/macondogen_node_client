const macondo = require('./client.js');

macondo.connect({
  host: 'localhost',
  port: 7776
});


macondo.on('connected', () => {
  console.log('Connected');
});


macondo.DESCRIBE_AGENT(0).then((agent) => {
  console.log('Agent: ', agent);
});

macondo.LIST_AGENTS().then((agents) => {
  console.log('Agents: ', agents);
});