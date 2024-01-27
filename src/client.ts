import tcp from 'net';
import {EventEmitter} from 'events';
import { Agent, EmittedEvent, Story, EventTemplate, ParameterAlias, RelationSet } from './types';

const numberRegex = /[0-9]+/;

export class MacondoClient extends EventEmitter {

  tcp_client = new tcp.Socket();
  current_command : Promise<any>|null = null;
  timeout_ms = 10000;

  constructor(options?:{
    timeout?: number;
  }) {
    super();
    const self = this;
    this.timeout_ms = options?.timeout || this.timeout_ms;
    self.tcp_client.on('data', (data:string) => {
      super.emit('data', data);
    });
  };
  
  public async connect(options: { port?: number; host?: string; }) {
    let self = this;
    this.tcp_client.connect(options.port || 7776, options.host || "localhost" , () => {
      super.emit('connected');
    });
    this.tcp_client.on('close', () => {
      super.emit('close');
      // reconects
      // tcp_client.connect(options.port, options.host, () => {
      //   console.log('Reconnected');
      // });
    });
    this.tcp_client.on('error', (err:Error) => {
      console.log('Connection error');
      super.emit('error', err);
      // Reconects 
      console.log("Trying to reconnect")
      // tcp_client.connect(options.port, options.host, () => {
      //   console.log('Reconnected');
      // });
    });
    this.tcp_client.on('end', () => {
      console.log('Connection ended');
      super.emit('end');
    });
  };
  
  private raw = async (line:string) : Promise<string> => {
    let self = this;
    if (this.tcp_client.destroyed) {
      throw new Error('Connection closed');
    }
    while (this.current_command != null) {
      try {
        await this.current_command;
      } catch (err) {
      }
    }
    this.current_command = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout on command ' + line));
      }, self.timeout_ms);
      this.tcp_client.once('data', (data:string) => {
        clearTimeout(timeout);
        this.current_command = null;
        resolve(data);
      });
      this.tcp_client.write(line + '\n');
    });
    return this.current_command;
  };
  
  
  public command = async (p_command:string) : Promise<any> => {
    if (typeof p_command !== 'string') {
      throw new Error('Commands must be strings');
    }
    const words = p_command.split(' ');
    const command = words[0];
    if (typeof ((this as any)[command]) == 'function') {
      return (this as any)[command](...words.slice(1));
    } else {
      throw new Error('Invalid command ' + command);
    }
  };
  
  public LIST_AGENTS = async () : Promise<number[]> => {
    const data = await this.raw('LIST_AGENTS');
    const agents = data.toString().split('\n').filter((line:string) => {
      return (line.length > 0) && (numberRegex.test(line[0]));
    });
    return agents.map((agent:string) => {
      return parseInt(agent);
    });
  };
  
  public async DESCRIBE_AGENT(p_agent_id:number) : Promise<Agent> {
    const agent_id = p_agent_id;
    if (isNaN(agent_id)) {
      throw new Error('Invalid agent id');
    }
    const data = await this.raw(`DESCRIBE_AGENT ${agent_id}`);
    const lines = data.toString().split('\n').filter((line:string) => {
      return (line.length > 0);
    });
    let agent : Agent = {
      id: agent_id,
      parameters: {},
      labels: {},
      tags: [],
    };
    lines.forEach((line:string) => {
      if (line.startsWith('PARAMETER_ALIAS ')) {
        const parts = line.split(' ');
        agent.parameters[parts[1]] = parseFloat(parts[2]);
      } else if (line.startsWith('LABEL ')) {
        // pattern here is LABEL <label_name> : <label_value>
        const parts = line.split(':');
        const label_name = parts[0].split(' ')[1];
        const label_value = parts[1].trim();
        agent.labels[label_name] = label_value;
      } else if (line.startsWith('PARAMETER ')) {
        const parts = line.split(' ');
        agent.parameters[parts[1]] = parseFloat(parts[2]);
      } else if (line.startsWith('TAG ')) {
        const parts = line.split(' ');
        agent.tags.push(parts[1]);
      }
    });
    return agent;
  };
  
  public async POP_EVENT(p_amount = 1) : Promise<EmittedEvent[]> {
    const amount = p_amount;
    if (isNaN(amount) || (amount < 1)) {
      throw new Error('Invalid amount');
    }
    const data = await this.raw(`POP_EVENT ${amount}`);
    const lines = data.toString().split('\n').filter((line:string) => {
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
      const other_agent_id = (words.length > 3) ? parseInt(words[3]) : undefined;
      if (isNaN(timestamp) || isNaN(agent_id) || isNaN(template_id)) {
        throw new Error('Invalid event:' + line);
      }
      return {
        timestamp: timestamp,
        agentId: agent_id,
        otherAgentId: other_agent_id,
        templateId: template_id,
      }
    });
  };
  
  // Returns a boolean indicating if the event was pushed
  public async PROCEED(p_duration:number) : Promise<boolean> {
    const duration = p_duration;
    if (isNaN(duration)) {
      throw new Error('Invalid duration');
    }
    const data = await this.raw('PROCEED ' + duration);
    return data.toString().toLowerCase().startsWith('ok');
  }
  
  public async SELECT_STORY(p_story_id:number) : Promise<boolean> {
    const story_id = Math.floor(p_story_id);
    if (isNaN(story_id)) {
      throw new Error('Invalid story id');
    }
    const data = await this.raw('SELECT_STORY ' + story_id);
    return data.toString().toLowerCase().startsWith('ok');
  };
  
  // Returns a boolean indicating if the command was successful
  public async JSON(json:string|object) : Promise<boolean> {
    let p_json_str = '';
    if (typeof json === 'string') {
      p_json_str = json;
    } else {
      p_json_str = JSON.stringify(json);
    }
    const data = await this.raw('JSON ' + p_json_str);
    return data.toString().toLowerCase().startsWith('ok');
  }
  
  public async LIST_STORIES() : Promise<number[]> {
    const data = await this.raw('LIST_STORIES');
    const stories = data.toString().split('\n').filter((line:string) => {
      return (line.length > 0) && (numberRegex.test(line[0]));
    });
    return stories.map((story:string) => {
      return parseInt(story);
    });
  }
  public async NEW_STORY() : Promise<number> {
    const data = await this.raw('NEW_STORY');
    return parseInt(data.toString());
  }
  public async DEL_STORY(id:number) : Promise<boolean> {
    const data = await this.raw('DEL_STORY');
    return data.toString().toLowerCase().startsWith('ok');
  }
  public async LIST_PARAMETER_ALIASES() : Promise<ParameterAlias[]> {
    const data = await this.raw('LIST_PARAMETER_ALIASES');
    const aliases = data.toString().split('\n').filter((line:string) => {
      return (line.length > 0);
    });
    return aliases.map((alias:string) => {
      const parts = alias.split(' ');
      return {
        name: parts[0],
        expression: parts[1],
      };
    });
  }
  public async EXIT() : Promise<boolean> {
    const data = await this.raw('EXIT');
    return true;
  }
  public async UPDATE_AGENT_PARAMETER(agent_id:number, param:string, value:number) : Promise<boolean> {
    const data = await this.raw(`UPDATE_AGENT_PARAMETER ${agent_id} ${param} ${value}`);
    return data.toString().toLowerCase().startsWith('ok');
  }
  public async UPDATE_AGENT_RELATION(agent_id:number, other_agent_id:number, parameter:string, value:number) : Promise<boolean> {
    const data = await this.raw(`UPDATE_AGENT_RELATION ${agent_id} ${other_agent_id} ${parameter} ${value}`);
    return data.toString().toLowerCase().startsWith('ok');
  }
  public async UPDATE_AGENT_LABEL(agent_id:number, key:string, value:string) : Promise<boolean> {
    const data = await this.raw(`UPDATE_AGENT_LABEL ${agent_id} ${key} ${value}`);
    return data.toString().toLowerCase().startsWith('ok');
  }
  public async ADD_AGENT_TAG(agent_id:number, tag:string) : Promise<boolean> {
    const data = await this.raw(`ADD_AGENT_TAG ${agent_id} ${tag}`);
    return data.toString().toLowerCase().startsWith('ok');
  }
  public async REMOVE_AGENT_TAG(agent_id:number, tag:string) : Promise<boolean> {
    const data = await this.raw(`REMOVE_AGENT_TAG ${agent_id} ${tag}`);
    return data.toString().toLowerCase().startsWith('ok');
  }
  public async DESCRIBE_AGENT_RELATION(agent_id:number, other_agent_id:number) : Promise<RelationSet> {
    const data = await this.raw(`DESCRIBE_AGENT_RELATION ${agent_id} ${other_agent_id}`);
    const lines = data.toString().split('\n').filter((line:string) => {
      return line.startsWith('RELATION ');
    });
    let relation_set : RelationSet = {};
    lines.forEach((line:string) => {
      const parts = line.split(' ');
      relation_set[parts[1]] = parseFloat(parts[2]);
    });
    return relation_set;
  }
  public async LIST_EVENT_TEMPLATES() : Promise<number[]> {
    const data = await this.raw('LIST_EVENT_TEMPLATES');
    const lines = data.toString().split('\n').filter((line:string) => {
      return (line.length > 0) && (numberRegex.test(line[0]));
    });
    return lines.map((line:string) => {
      return parseInt(line);
    });
  }
  public async DESCRIBE_EVENT_TEMPLATE(template_id:number) : Promise<EventTemplate> {
    const data = await this.raw('DESCRIBE_EVENT_TEMPLATE ' + template_id);
    let ret : EventTemplate = {
      id: template_id,
      name: '',
      type: 'self',
      labels: {},
      tags: new Set(),
      expression: '',
    };
    const lines = data.toString().split('\n').filter((line:string) => {
      if (line.startsWith('NAME ')) {
        ret.name = line.split(' ').slice(1).join(' ');
      } else if (line.startsWith('EXPRESSION ')) {
        ret.expression = line.split(' ').slice(1).join(' ');
      } else if (line.startsWith('LABEL ')) {
        const parts = line.split(':');
        const label_name = parts[0].split(' ')[1];
        const label_value = parts[1].trim();
        ret.labels[label_name] = label_value;
      } else if (line.startsWith('TAG ')) {
        const parts = line.split(' ');
        ret.tags.add(parts[1]);
      } else if (line.startsWith('TYPE ')) {
        const parts = line.split(' ');
        ret.type = parts[1] as any;
      }
    });
    return ret;
  }
  
}
