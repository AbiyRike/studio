
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getKnowledgeBaseItems, type KnowledgeBaseItem } from '@/lib/knowledge-base-store';
import { FileText, Image as ImageIcon, Mic, Search, Eye, AlertTriangle, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

const getIconForContent = (item: KnowledgeBaseItem) => {
  if (item.mediaDataUri?.startsWith('data:image')) {
    return <ImageIcon className="h-6 w-6 text-accent flex-shrink-0" />;
  }
  if (item.documentName.toLowerCase().includes('audio') || (item.documentContent || "").toLowerCase().includes('audio recording')) {
    return <Mic className="h-6 w-6 text-accent flex-shrink-0" />;
  }
  return <FileText className="h-6 w-6 text-accent flex-shrink-0" />;
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: "easeOut"
    }
  })
};

export function KnowledgeBaseContentsDisplay() {
  const [allItems, setAllItems] = useState<KnowledgeBaseItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<KnowledgeBaseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const items = getKnowledgeBaseItems();
    setAllItems(items);
    setFilteredItems(items);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const results = allItems.filter(item =>
      item.documentName.toLowerCase().includes(lowerSearchTerm) ||
      item.summary.toLowerCase().includes(lowerSearchTerm)
    );
    setFilteredItems(results);
  }, [searchTerm, allItems]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader><div className="h-6 bg-muted rounded w-3/4"></div></CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-10 bg-muted rounded w-full mb-3"></div>
              <div className="h-8 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="relative max-w-xl mx-auto">
        <Input
          type="text"
          placeholder="Search your knowledge..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-3 text-base border-2 focus:border-primary transition-colors"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      </div>

      {filteredItems.length === 0 ? (
        <Card className="text-center py-16 shadow-md border-dashed border-muted-foreground/50">
          <CardContent className="flex flex-col items-center">
            <AlertTriangle className="mx-auto h-20 w-20 text-muted-foreground mb-6" />
            <h3 className="text-2xl font-semibold text-muted-foreground mb-3">
              {searchTerm ? "No items match your search." : "Your Knowledge Library is Empty"}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md">
              {searchTerm 
                ? "Try a different search term or clear the search to see all items." 
                : "Start building your library by adding documents, notes, or media."}
            </p>
            <Button asChild size="lg" className="text-base py-3 px-6">
              <Link href="/knowledge-base/new">
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Content
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className="h-full" // Ensure motion.div takes full height for flex to work
            >
              <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300 border border-border hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl font-headline mb-1 line-clamp-2 leading-tight flex-grow">
                      <Link href={`/knowledge-base/view/${item.id}`} className="hover:text-primary transition-colors">
                        {item.documentName}
                      </Link>
                    </CardTitle>
                    {getIconForContent(item)}
                  </div>
                  <CardDescription className="text-xs">
                    Added: {format(new Date(item.createdAt), "PP")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow pt-0 pb-4">
                  <p className="text-sm text-muted-foreground line-clamp-4">{item.summary || "No summary available."}</p>
                </CardContent>
                <CardContent className="pt-0 pb-4 mt-auto">
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={`/knowledge-base/view/${item.id}`}>
                      <Eye className="mr-2 h-4 w-4" /> View Details
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
