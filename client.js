const tcp = require('net');
const EventEmitter = require('events');

const numberRegex = /[0-9]+/;

const tcp_client = new tcp.Socket();
let current_command = null;
let client = new EventEmitter();


client.connect = async function (options) {
  tcp_client.connect(options.port, options.host || 7776, () => {
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


client.raw = async (line) => {
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

client.command = async (p_command) => {
  if (typeof p_command !== 'string') {
    throw new Error('Commands must be strings');
  }
  const words = p_command.split(' ');
  const command = words[0];
  if (typeof (client[command]) == 'function') {
    return client[command](...words.slice(1));
  } else {
    throw new Error('Invalid command ' + command);
  }
};

// Returns an array of agent ids
client.LIST_AGENTS = async () => {
  const data = await client.raw('LIST_AGENTS');
  const agents = data.toString().split('\n').filter((line) => {
    return (line.length > 0) && (numberRegex.test(line[0]));
  });
  return agents;
};

// Returns an agent object with the following structure:
// {
//   id: 0,
//   parameters: {
//     'param_name': param_value
//   },
//   labels: {
//     'label_name': 'label_value'
//   }
// }

client.DESCRIBE_AGENT = async (p_agent_id) => {
  const agent_id = parseInt(p_agent_id);
  if (isNaN(agent_id)) {
    throw new Error('Invalid agent id');
  }
  const data = await client.raw(`DESCRIBE_AGENT ${agent_id}`);
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

// Returns an array of objects with the following structure:
// {
//   timestamp: 0,
//   template_id: 0,
//   agent_id: 0,
//   other_agent_id: 0 // <-- optional
// }
client.POP_EVENT = async (p_amount = 1) => {
  const amount = parseInt(p_amount);
  if (isNaN(amount) || (amount < 1)) {
    throw new Error('Invalid amount');
  }
  const data = await client.raw(`POP_EVENT ${amount}`);
  const lines = data.toString().split('\n').filter((line) => {
    const words = line.split(' ');
    if (words.length < 3) {
      return false;
    }
    return (line.length > 0);
  });
  return lines.map((line) => {
    const words = line.split(' ');

    const timestamp = parseFloat(words[0]);
    const template_id = parseInt(words[1]);
    const agent_id = parseInt(words[2]);
    const other_agent_id = (words.length > 3) ? parseInt(words[3]) : null;
    if (isNaN(timestamp) || isNaN(agent_id) || isNaN(template_id)) {
      throw new Error('Invalid event:', line);
    }
    const event = {
      timestamp: timestamp,
      template_id: template_id,
      agent_id: agent_id,
    };
    if (words.length > 3) {
      event.other_agent_id = parseInt(words[3]);
    }
    return event;
  });
};

client.PROCEED = async (p_duration) => {
  const duration = parseFloat(p_duration);
  if (isNaN(duration)) {
    throw new Error('Invalid duration');
  }
  const data = await client.raw('PROCEED ' + duration);
  return data.toString().toLowerCase().startsWith('ok');
}

client.SELECT_STORY = async (p_story_id) => {
  const story_id = parseInt(p_story_id);
  if (isNaN(story_id)) {
    throw new Error('Invalid story id');
  }
  const data = await client.raw('SELECT_STORY ' + story_id);
  return data.toString().toLowerCase().startsWith('ok');
};

client.JSON = async (p_json_str) => {
  let json_obj;
  try {
    json_obj = JSON.parse(p_json_str);
  } catch (err) {
    throw new Error('Invalid JSON string');
  }
  const data = await client.raw('JSON ' + p_json_str);
  return data.toString().toLowerCase().startsWith('ok');
}


module.exports = client;