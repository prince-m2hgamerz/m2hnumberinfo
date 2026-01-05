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
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="w-4 h-4" />
            Recent Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-3 p-3 rounded-md bg-secondary/50">
                <div className="w-8 h-8 rounded-md bg-secondary" />
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
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="w-4 h-4" />
            Recent Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No search history yet</p>
            <p className="text-xs mt-1">Your lookups will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Recent Searches
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {history.length} lookups
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-2">
            {history.map((item, index) => (
              <div 
                key={item.id} 
                className="p-3 rounded-md bg-secondary/30 border border-border hover:border-muted-foreground/30 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-foreground">{item.phone_number}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <User className="w-3 h-3 flex-shrink-0" />
                        {item.name || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {format(new Date(item.created_at), "MMM d")}
                    </p>
                    {item.circle && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.circle}</p>
                    )}
                  </div>
                </div>
                {item.address && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{item.address}</span>
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