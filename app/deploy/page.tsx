'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorCard } from '@/components/shared/error-card';
import { Rocket, Plus, Trash2, Power, Shuffle } from 'lucide-react';
import { generateFishSVG, ACCESSORY_OPTIONS, COLOUR_OPTIONS, SPECIES_OPTIONS, type Accessory, type Species } from '@/lib/fish/sprites';

interface Agent {
  id: string;
  name: string;
  enabled: boolean;
  module: 'regulatory' | 'due_diligence' | 'earnings' | 'cyber';
  conditions: { operator: string; checks: Array<{ fact: string; operator: string; value: unknown }> };
  actions: Array<{ type: string; config: Record<string, string> }>;
  fish_sprite: string;
  created_at: string;
  last_triggered: string | null;
}

export default function DeployPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [module, setModule] = useState<'regulatory' | 'due_diligence' | 'earnings' | 'cyber'>('regulatory');
  const [condOperator, setCondOperator] = useState<'all' | 'any'>('all');
  const [checks, setChecks] = useState([{ fact: '', operator: 'equal', value: '' }]);
  const [actionType, setActionType] = useState('slack');
  const [actionConfig, setActionConfig] = useState<Record<string, string>>({ channel: '', template: '' });
  const [fishSpecies, setFishSpecies] = useState<Species>('auto');
  const [fishColour, setFishColour] = useState('auto');
  const [fishAccessory, setFishAccessory] = useState<Accessory>('none');
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fishConfig = { species: fishSpecies, colour: fishColour, accessory: fishAccessory };
  const previewSVG = generateFishSVG(module, name || 'preview', fishConfig);

  const randomiseFish = () => {
    const speciesVals: Species[] = ['clownfish', 'angelfish', 'pufferfish'];
    const colourVals = ['25', '0', '200', '270', '320', '50', '140'];
    const accessoryVals: Accessory[] = ['none', 'top_hat', 'party_hat', 'crown', 'beanie', 'glasses', 'monocle', 'bow_tie', 'scarf'];
    setFishSpecies(speciesVals[Math.floor(Math.random() * speciesVals.length)]);
    setFishColour(colourVals[Math.floor(Math.random() * colourVals.length)]);
    setFishAccessory(accessoryVals[Math.floor(Math.random() * accessoryVals.length)]);
  };

  const loadAgents = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error(`Failed to load agents (${res.status})`);
      setAgents(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  const createAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedChecks = checks.filter(c => c.fact).map(c => ({
      ...c,
      value: c.operator === 'greaterThan' || c.operator === 'lessThan'
        ? (isNaN(Number(c.value)) ? c.value : Number(c.value))
        : c.value,
    }));
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        enabled: true,
        module,
        conditions: { operator: condOperator, checks: parsedChecks },
        actions: [{ type: actionType, config: actionConfig }],
        fish_config: fishConfig,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Failed to create agent' }));
      setError(typeof body.error === 'string' ? body.error : JSON.stringify(body.error));
      return;
    }
    router.push('/');
  };

  const toggleAgent = async (agent: Agent) => {
    await fetch('/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: agent.id, enabled: !agent.enabled }),
    });
    loadAgents();
  };

  const deleteAgent = async (id: string) => {
    await fetch('/api/agents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadAgents();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deploy</h1>
          <p className="text-muted-foreground">Create persistent agents that monitor and act autonomously</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Rocket className="mr-2 h-4 w-4" />
          New Agent
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Agent</CardTitle>
            <CardDescription>Configure your fish agent, set conditions, and deploy to the pool</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createAgent} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input placeholder="Agent Name" value={name} onChange={e => setName(e.target.value)} className="flex-1" required />
                <select value={module} onChange={e => setModule(e.target.value as typeof module)} className="rounded-md border px-3 py-2 text-sm bg-background text-foreground">
                  <option value="regulatory">Regulatory</option>
                  <option value="due_diligence">Due Diligence</option>
                  <option value="earnings">Earnings</option>
                  <option value="cyber">Cyber</option>
                </select>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Customise Fish</p>
                  <Button type="button" variant="outline" size="sm" onClick={randomiseFish}>
                    <Shuffle className="mr-1.5 h-3 w-3" />
                    Randomise
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                  <div className="w-28 h-24 flex items-center justify-center rounded-xl bg-gradient-to-b from-sky-100 to-cyan-200 dark:from-sky-950 dark:to-cyan-900 border shrink-0 mx-auto sm:mx-0">
                    <div dangerouslySetInnerHTML={{ __html: previewSVG }} />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Species</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SPECIES_OPTIONS.map(s => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setFishSpecies(s.value)}
                            className={`px-2 py-1 rounded text-xs border transition-colors ${
                              fishSpecies === s.value
                                ? 'border-primary bg-primary/10 font-medium'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Colour</p>
                      <div className="flex flex-wrap gap-1.5">
                        {COLOUR_OPTIONS.map(c => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setFishColour(c.value)}
                            className={`px-2 py-1 rounded text-xs border transition-colors ${
                              fishColour === c.value
                                ? 'border-primary bg-primary/10 font-medium'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {c.value !== 'auto' && (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle"
                                style={{ backgroundColor: `hsl(${c.value}, 80%, 55%)` }}
                              />
                            )}
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Accessory</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ACCESSORY_OPTIONS.map(a => (
                          <button
                            key={a.value}
                            type="button"
                            onClick={() => setFishAccessory(a.value)}
                            className={`px-2 py-1 rounded text-xs border transition-colors ${
                              fishAccessory === a.value
                                ? 'border-primary bg-primary/10 font-medium'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium">Conditions</p>
                  <select value={condOperator} onChange={e => setCondOperator(e.target.value as 'all' | 'any')} className="rounded-md border px-2 py-1 text-xs bg-background text-foreground">
                    <option value="all">ALL must match</option>
                    <option value="any">ANY must match</option>
                  </select>
                </div>
                {checks.map((check, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input placeholder="Fact (e.g. regulator)" value={check.fact} onChange={e => {
                      const next = [...checks]; next[i].fact = e.target.value; setChecks(next);
                    }} className="flex-1" />
                    <select value={check.operator} onChange={e => {
                      const next = [...checks]; next[i].operator = e.target.value; setChecks(next);
                    }} className="rounded-md border px-2 py-1 text-sm bg-background text-foreground">
                      {['equal', 'notEqual', 'contains', 'greaterThan', 'lessThan', 'in'].map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    <Input placeholder="Value" value={check.value} onChange={e => {
                      const next = [...checks]; next[i].value = e.target.value; setChecks(next);
                    }} className="flex-1" />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setChecks([...checks, { fact: '', operator: 'equal', value: '' }])}>
                  + Add Condition
                </Button>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Action</p>
                <div className="flex gap-2">
                  <select value={actionType} onChange={e => {
                    const newType = e.target.value;
                    setActionType(newType);
                    const defaults: Record<string, Record<string, string>> = {
                      slack: { channel: '', template: '' },
                      email: { to: '', subject: '', template: '' },
                      telegram: { chat_id: '', template: '' },
                      webhook: { url: '' },
                    };
                    setActionConfig(defaults[newType] ?? {});
                  }} className="rounded-md border px-3 py-2 text-sm bg-background text-foreground">
                    {['slack', 'email', 'telegram', 'webhook'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {actionType === 'slack' && (
                    <>
                      <Input placeholder="Channel" value={actionConfig.channel ?? ''} onChange={e => setActionConfig({ ...actionConfig, channel: e.target.value })} />
                      <Input placeholder="Template" value={actionConfig.template ?? ''} onChange={e => setActionConfig({ ...actionConfig, template: e.target.value })} />
                    </>
                  )}
                  {actionType === 'email' && (
                    <Input placeholder="To email" value={actionConfig.to ?? ''} onChange={e => setActionConfig({ ...actionConfig, to: e.target.value })} />
                  )}
                  {actionType === 'telegram' && (
                    <Input placeholder="Chat ID" value={actionConfig.chat_id ?? ''} onChange={e => setActionConfig({ ...actionConfig, chat_id: e.target.value })} />
                  )}
                  {actionType === 'webhook' && (
                    <Input placeholder="Webhook URL" value={actionConfig.url ?? ''} onChange={e => setActionConfig({ ...actionConfig, url: e.target.value })} className="flex-1" />
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Deploy to Pool</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && <ErrorCard message={error} onRetry={loadAgents} />}

      {loadingAgents ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : agents.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No agents deployed yet. Click &quot;New Agent&quot; to create your first.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map(agent => (
            <Card key={agent.id} className={!agent.enabled ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-12 flex items-center justify-center rounded-lg bg-gradient-to-b from-sky-100 to-cyan-200 dark:from-sky-950 dark:to-cyan-900 shrink-0">
                    <div dangerouslySetInnerHTML={{ __html: agent.fish_sprite }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm truncate">{agent.name}</CardTitle>
                    <Badge variant="outline" className="text-xs mt-1">{agent.module.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  {agent.conditions.operator.toUpperCase()}: {agent.conditions.checks.length} condition(s)
                </div>
                <div className="flex gap-1">
                  {agent.actions.map((a, i) => <Badge key={i} variant="secondary" className="text-xs">{a.type}</Badge>)}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => toggleAgent(agent)}>
                    <Power className={`h-4 w-4 mr-1 ${agent.enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className="text-xs">{agent.enabled ? 'Active' : 'Disabled'}</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteAgent(agent.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
