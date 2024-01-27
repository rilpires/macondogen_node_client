import * as macondo from './client'
const client = new macondo.MacondoClient();


client.connect({
  host: 'localhost',
  port: 7776
});

client.on('connected', () => {
  console.log('Connected');

  setImmediate(async () => {
    console.log(await client.LIST_AGENTS());
    console.log(await client.DESCRIBE_AGENT(0));
    console.log(await client.PROCEED(1));
    console.log(await client.POP_EVENT(2222));
    console.log(await client.UPDATE_AGENT_LABEL(0, "test_key", "test_value"));
    console.log(await client.DESCRIBE_AGENT(0));
    console.log(await client.UPDATE_AGENT_LABEL(0, "test_key", ""));
    console.log(await client.DESCRIBE_AGENT(0));
    console.log(await client.UPDATE_AGENT_PARAMETER(0, "wealth", 0.111111111111111111));
    console.log(await client.DESCRIBE_AGENT(0));
    console.log(await client.UPDATE_AGENT_RELATION(0, 1, "respect", 0.15));
    console.log(await client.DESCRIBE_AGENT_RELATION(0, 1));
    console.log(await client.ADD_AGENT_TAG(0, "test_tag"));
    console.log(await client.DESCRIBE_AGENT(0));
    console.log(await client.REMOVE_AGENT_TAG(0, "test_tag"));
    console.log(await client.DESCRIBE_AGENT(0));
  });
});
