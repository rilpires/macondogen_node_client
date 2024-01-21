const tcp = require('net');
const EventEmitter = require('events');

const numberRegex = /[0-9]+/;

const tcp_client = new tcp.Socket();
let current_command = null;
let client = new EventEmitter();


client.connect = async function (options) {
  tcp_client.connect(options.port, options.host, () => {
    client.emit('connected');
  });
  tcp_client.on('close', () => {
    client.emit('close');
    // reconects
    // tcp_client.connect(options.port, options.host, () => {
    //   console.log('Reconnected');
    // });
  });
  tcp_client.on('error', (err) => {
    console.log('Connection error');
    client.emit('error', err);
    // Reconects 
    console.log("Trying to reconnect")
    // tcp_client.connect(options.port, options.host, () => {
    //   console.log('Reconnected');
    // });
  });
  tcp_client.on('end', () => {
    console.log('Connection ended');
    client.emit('end');
  });
};


client.command = async (line) => {
  if (tcp_client.destroyed) {
    throw new Error('Connection closed');
  }
  while (current_command != null) {
    try {
      await current_command;
    } catch (err) {
    }
  }
  current_command = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout on command ' + line));
    }, 5000);
    tcp_client.once('data', (data) => {
      clearTimeout(timeout);
      current_command = null;
      resolve(data);
    });
    tcp_client.write(line + '\n');
  });
  return current_command;
};

// Returns an array of agent ids
client.LIST_AGENTS = async () => {
  const data = await client.command('LIST_AGENTS');
  const agents = data.toString().split('\n').filter((line) => {
    return (line.length > 0) && (numberRegex.test(line[0]));
  });
  return agents;
};

// Returns an agent object
client.DESCRIBE_AGENT = async (p_agent_id) => {
  const agent_id = parseInt(p_agent_id);
  if (isNaN(agent_id)) {
    throw new Error('Invalid agent id');
  }
  const data = await client.command(`DESCRIBE_AGENT ${agent_id}`);
  const lines = data.toString().split('\n').filter((line) => {
    return (line.length > 0);
  });
  const agent = {
    id: agent_id,
    parameters: {},
    labels: {}
  };
  lines.forEach((line) => {
    if (line.startsWith('PARAMETER_ALIAS')) {
      const parts = line.split(' ');
      agent.parameters[parts[1]] = parseFloat(parts[2]);
    } else if (line.startsWith('LABEL')) {
      const parts = line.split(' ');
      agent.labels[parts[1]] = parts[2];
    } else if (line.startsWith('PARAMETER')) {
      const parts = line.split(' ');
      agent.parameters[parts[1]] = parseFloat(parts[2]);
    }
  });
  return agent;
};



module.exports = client;