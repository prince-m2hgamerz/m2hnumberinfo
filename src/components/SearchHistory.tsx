import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Phone, User, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";

interface SearchHistoryItem {
  id: string;
  phone_number: string;
  name: string | null;
  address: string | null;
  circle: string | null;
  created_at: string;
}

interface SearchHistoryProps {
  history: SearchHistoryItem[];
  loading?: boolean;
}

export const SearchHistory = ({ history, loading }: SearchHistoryProps) => {
  if (loading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Recent Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-4 p-3 rounded-lg bg-secondary/30">
                <div className="w-10 h-10 rounded-lg bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary rounded w-1/3" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Recent Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No search history yet</p>
            <p className="text-xs">Your recent lookups will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Recent Searches
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            Last {history.length} lookups
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {history.map((item, index) => (
              <div 
                key={item.id} 
                className="p-4 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono font-medium text-foreground">{item.phone_number}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.name || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {format(new Date(item.created_at), "MMM d, h:mm a")}
                    </p>
                    {item.circle && (
                      <p className="text-xs text-primary mt-1">{item.circle}</p>
                    )}
                  </div>
                </div>
                {item.address && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.address}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
