'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTinyFishStream } from '@/hooks/useTinyFishStream';
import { ActivityFeed } from '@/components/shared/activity-feed';
import { ErrorCard } from '@/components/shared/error-card';
import { ScrollText } from 'lucide-react';

const DOMAINS = ['Retail FX', 'Digital Payments', 'Insurance', 'Structured Products', 'Wealth Management'];
const JURISDICTIONS = [
  { code: 'SG', label: 'Singapore' },
  { code: 'US', label: 'United States' },
  { code: 'HK', label: 'Hong Kong' },
  { code: 'UK', label: 'United Kingdom' },
  { code: 'INT', label: 'International' },
];

export default function RegulatoryPage() {
  const [selectedDomains, setSelectedDomains] = useState<string[]>(['Digital Payments', 'Retail FX']);
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>(['SG', 'US', 'HK', 'UK', 'INT']);
  const { events, result, isLoading, error, start } = useTinyFishStream();

  const handleScan = async () => {
    await start('/api/sentry/regulatory', {
      business_domains: selectedDomains,
      jurisdictions: selectedJurisdictions,
    });
  };

  const toggleDomain = (d: string) => setSelectedDomains(prev =>
    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
  );

  const toggleJurisdiction = (j: string) => setSelectedJurisdictions(prev =>
    prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j]
  );

  const data = result as Record<string, unknown> | null;
  const publications = (data?.publications as Array<Record<string, unknown>>) ?? [];
  const synthesis = data?.synthesis as Record<string, string[]> | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Regulatory Pulse</h1>
        <p className="text-muted-foreground">Cross-jurisdiction regulatory monitoring with relevance scoring</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Business Domains</p>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map(d => (
                <Badge
                  key={d}
                  variant={selectedDomains.includes(d) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleDomain(d)}
                >
                  {d}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Jurisdictions</p>
            <div className="flex flex-wrap gap-2">
              {JURISDICTIONS.map(j => (
                <Badge
                  key={j.code}
                  variant={selectedJurisdictions.includes(j.code) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleJurisdiction(j.code)}
                >
                  {j.label}
                </Badge>
              ))}
            </div>
          </div>
          <Button onClick={handleScan} disabled={isLoading}>
            <ScrollText className="mr-2 h-4 w-4" />
            {isLoading ? 'Scanning...' : 'Scan Regulators'}
          </Button>
        </CardContent>
      </Card>

      {error && <ErrorCard message={error} onRetry={handleScan} />}

      {events.length > 0 && <ActivityFeed events={events} />}

      {isLoading && !result && events.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {synthesis && (
        <Tabs defaultValue="urgent">
          <TabsList>
            <TabsTrigger value="urgent">Urgent ({(synthesis.urgent_actions ?? []).length})</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring ({(synthesis.monitoring_items ?? []).length})</TabsTrigger>
            <TabsTrigger value="info">Informational ({(synthesis.informational ?? []).length})</TabsTrigger>
          </TabsList>
          <TabsContent value="urgent" className="space-y-2">
            {(synthesis.urgent_actions ?? []).map((a, i) => (
              <Card key={i}><CardContent className="pt-4 text-sm">{a}</CardContent></Card>
            ))}
          </TabsContent>
          <TabsContent value="monitoring" className="space-y-2">
            {(synthesis.monitoring_items ?? []).map((m, i) => (
              <Card key={i}><CardContent className="pt-4 text-sm">{m}</CardContent></Card>
            ))}
          </TabsContent>
          <TabsContent value="info" className="space-y-2">
            {(synthesis.informational ?? []).map((inf, i) => (
              <Card key={i}><CardContent className="pt-4 text-sm">{inf}</CardContent></Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {publications.length > 0 && (
        <div className="space-y-3">
          {[...publications].sort((a, b) => Number(b.relevance_score) - Number(a.relevance_score)).map((pub, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{String(pub.relevance_score)}</div>
                    <Progress value={Number(pub.relevance_score) * 10} className="w-12 mt-1" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm">{String(pub.title)}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge>{String(pub.regulator)}</Badge>
                      <Badge variant="outline">{String(pub.jurisdiction)}</Badge>
                      <Badge variant="secondary">{String(pub.document_type)}</Badge>
                      <span className="text-muted-foreground">{String(pub.date)}</span>
                      {pub.comment_deadline ? (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          Deadline: {String(pub.comment_deadline)}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{String(pub.summary)}</p>
                    <div className="flex gap-1">
                      {(pub.affected_domains as string[] ?? []).map((d, j) => (
                        <Badge key={j} variant="outline" className="text-xs">{d}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
