export type Agent = {
  id: number;
  parameters: Record<string, number>;
  labels: Record<string, string>;
  tags: string[];
};

export type ParameterAlias = {
  name: string;
  expression: string;
};

export type EmittedEvent = {
  timestamp: number;
  agentId: number;
  otherAgentId?: number;
  templateId: number;
}

export type EventTemplate = {
  id: number;
  name: string;
  type: 'self' | 'unidirectional' | 'bidirectional';
  labels: Record<string, string>;
  tags: Set<string>;
  expression: string;
};

export type Story = {
  id: number;
  name: string;
  labels: Record<string, string>;
  tags: Set<string>;
  eventTemplates: Record<number, EventTemplate>;
  agents: Record<number, Agent>;
  parameterAliases: Record<string, string>;
  relationDefaults: Record<string, number>;
};


export type Trigger = {
  id: number;
  filter: {
    event_tags_any: string[];
    event_tags_all: string[];
  };
  expressions: Record<string, string>;
};

export type RelationSet = Record<string, number>;