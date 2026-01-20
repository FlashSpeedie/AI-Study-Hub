import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  BookOpen,
  Edit,
  Shuffle,
  Check
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { formatAIResponse } from '@/lib/utils';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  mastered: boolean;
}

interface Deck {
  id: string;
  name: string;
  cards: Flashcard[];
  created_at: string;
}

export default function Flashcards() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deckDialog, setDeckDialog] = useState<{ open: boolean; name: string }>({ open: false, name: '' });
  const [cardDialog, setCardDialog] = useState<{ open: boolean; front: string; back: string; edit?: string }>({ open: false, front: '', back: '' });
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [studyMode, setStudyMode] = useState(false);

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('flashcard_decks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedDecks: Deck[] = (data || []).map(d => ({
        id: d.id,
        name: d.name,
        created_at: d.created_at,
        cards: parseCards(d.cards),
      }));

      setDecks(mappedDecks);
    } catch (error) {
      console.error('Error fetching decks:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseCards = (cards: Json): Flashcard[] => {
    if (!cards || !Array.isArray(cards)) return [];
    return cards.map((c: unknown) => {
      const card = c as Record<string, unknown>;
      return {
        id: String(card.id || crypto.randomUUID()),
        front: String(card.front || ''),
        back: String(card.back || ''),
        mastered: Boolean(card.mastered),
      };
    });
  };

  const saveDeck = async (deck: Deck) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('flashcard_decks')
        .update({
          name: deck.name,
          cards: deck.cards as unknown as Json,
        })
        .eq('id', deck.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving deck:', error);
      toast.error('Failed to save deck');
    }
  };

  const createDeck = async () => {
    if (!deckDialog.name.trim()) {
      toast.error('Please enter a deck name');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('flashcard_decks')
        .insert({
          user_id: user.id,
          name: deckDialog.name,
          cards: [] as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Deck created!');
      setDeckDialog({ open: false, name: '' });
      
      const newDeck: Deck = {
        id: data.id,
        name: data.name,
        created_at: data.created_at,
        cards: [],
      };
      setDecks([newDeck, ...decks]);
      setSelectedDeck(newDeck);
    } catch (error) {
      console.error('Error creating deck:', error);
      toast.error('Failed to create deck');
    }
  };

  const deleteDeck = async (deckId: string) => {
    try {
      const { error } = await supabase
        .from('flashcard_decks')
        .delete()
        .eq('id', deckId);

      if (error) throw error;
      toast.success('Deck deleted');
      if (selectedDeck?.id === deckId) {
        setSelectedDeck(null);
      }
      setDecks(decks.filter(d => d.id !== deckId));
    } catch (error) {
      console.error('Error deleting deck:', error);
      toast.error('Failed to delete deck');
    }
  };

  const addCard = () => {
    if (!cardDialog.front.trim() || !cardDialog.back.trim() || !selectedDeck) {
      toast.error('Please fill in both sides of the card');
      return;
    }

    const updatedDeck = { ...selectedDeck };
    
    if (cardDialog.edit) {
      updatedDeck.cards = updatedDeck.cards.map(c =>
        c.id === cardDialog.edit ? { ...c, front: cardDialog.front, back: cardDialog.back } : c
      );
    } else {
      updatedDeck.cards.push({
        id: crypto.randomUUID(),
        front: cardDialog.front,
        back: cardDialog.back,
        mastered: false,
      });
    }

    setSelectedDeck(updatedDeck);
    setDecks(decks.map(d => d.id === updatedDeck.id ? updatedDeck : d));
    saveDeck(updatedDeck);
    setCardDialog({ open: false, front: '', back: '' });
    toast.success(cardDialog.edit ? 'Card updated!' : 'Card added!');
  };

  const deleteCard = (cardId: string) => {
    if (!selectedDeck) return;
    const updatedDeck = {
      ...selectedDeck,
      cards: selectedDeck.cards.filter(c => c.id !== cardId),
    };
    setSelectedDeck(updatedDeck);
    setDecks(decks.map(d => d.id === updatedDeck.id ? updatedDeck : d));
    saveDeck(updatedDeck);
    if (currentCardIndex >= updatedDeck.cards.length) {
      setCurrentCardIndex(Math.max(0, updatedDeck.cards.length - 1));
    }
    toast.success('Card deleted');
  };

  const toggleMastered = (cardId: string) => {
    if (!selectedDeck) return;
    const updatedDeck = {
      ...selectedDeck,
      cards: selectedDeck.cards.map(c =>
        c.id === cardId ? { ...c, mastered: !c.mastered } : c
      ),
    };
    setSelectedDeck(updatedDeck);
    setDecks(decks.map(d => d.id === updatedDeck.id ? updatedDeck : d));
    saveDeck(updatedDeck);
  };

  const shuffleCards = () => {
    if (!selectedDeck) return;
    const shuffled = [...selectedDeck.cards].sort(() => Math.random() - 0.5);
    const updatedDeck = { ...selectedDeck, cards: shuffled };
    setSelectedDeck(updatedDeck);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim() || !selectedDeck) {
      toast.error('Please enter a topic');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: { topic: aiPrompt, count: 5 },
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data?.error) {
        if (data.error.includes('429') || data.error.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (data.error.includes('402')) {
          toast.error('Please add credits to your workspace.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      const { flashcards } = data;
      
      const newCards = (flashcards || []).map((fc: { front: string; back: string }) => ({
        id: crypto.randomUUID(),
        front: fc.front,
        back: fc.back,
        mastered: false,
      }));

      const updatedDeck = {
        ...selectedDeck,
        cards: [...selectedDeck.cards, ...newCards],
      };

      setSelectedDeck(updatedDeck);
      setDecks(decks.map(d => d.id === updatedDeck.id ? updatedDeck : d));
      await saveDeck(updatedDeck);
      setAiPrompt('');
      toast.success(`Generated ${newCards.length} flashcards!`);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast.error('Failed to generate flashcards');
    } finally {
      setGenerating(false);
    }
  };

  const nextCard = () => {
    if (!selectedDeck) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % selectedDeck.cards.length);
    }, 150);
  };

  const prevCard = () => {
    if (!selectedDeck) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev - 1 + selectedDeck.cards.length) % selectedDeck.cards.length);
    }, 150);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Deck List View
  if (!selectedDeck) {
    return (
      <div className="max-w-5xl mx-auto animate-in">
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="p-2 rounded-xl bg-primary/10">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold">Flashcards</h1>
          </motion.div>
          <p className="text-muted-foreground">
            Create study cards from your notes to help memorize topics
          </p>
        </div>

        <div className="flex justify-end mb-6">
          <Button onClick={() => setDeckDialog({ open: true, name: '' })} className="gap-2">
            <Plus className="w-4 h-4" />
            New Deck
          </Button>
        </div>

        {decks.length === 0 ? (
          <Card className="p-12 text-center">
            <Layers className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No flashcard decks yet</h3>
            <p className="text-muted-foreground mb-6">Create your first deck to start studying!</p>
            <Button onClick={() => setDeckDialog({ open: true, name: '' })} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Deck
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck, index) => (
              <motion.div
                key={deck.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="p-5 cursor-pointer hover:shadow-soft transition-all group"
                  onClick={() => {
                    setSelectedDeck(deck);
                    setCurrentCardIndex(0);
                    setIsFlipped(false);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-ruby hover:text-ruby"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDeck(deck.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{deck.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {deck.cards.length} cards • {deck.cards.filter(c => c.mastered).length} mastered
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Deck Dialog */}
        <Dialog open={deckDialog.open} onOpenChange={(open) => setDeckDialog({ ...deckDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Deck</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="deckName">Deck Name</Label>
              <Input
                id="deckName"
                value={deckDialog.name}
                onChange={(e) => setDeckDialog({ ...deckDialog, name: e.target.value })}
                placeholder="e.g., Biology Chapter 5"
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeckDialog({ open: false, name: '' })}>Cancel</Button>
              <Button onClick={createDeck}>Create Deck</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Study Mode
  if (studyMode && selectedDeck.cards.length > 0) {
    const currentCard = selectedDeck.cards[currentCardIndex];
    const masteredCount = selectedDeck.cards.filter(c => c.mastered).length;

    return (
      <div className="max-w-3xl mx-auto animate-in">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setStudyMode(false)} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Exit Study
          </Button>
          <div className="text-sm text-muted-foreground">
            {currentCardIndex + 1} / {selectedDeck.cards.length} • {masteredCount} mastered
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-muted rounded-full mb-8 overflow-hidden">
          <motion.div 
            className="h-full bg-emerald rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(masteredCount / selectedDeck.cards.length) * 100}%` }}
          />
        </div>

        {/* Flashcard */}
        <div 
          className="relative h-80 cursor-pointer mb-6"
          onClick={() => setIsFlipped(!isFlipped)}
          style={{ perspective: '1000px' }}
        >
          <motion.div
            className="w-full h-full relative"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.4 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front */}
            <Card 
              className="absolute inset-0 p-8 flex items-center justify-center text-center"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <p className="text-xl font-medium">{formatAIResponse(currentCard.front)}</p>
            </Card>
            
            {/* Back */}
            <Card 
              className="absolute inset-0 p-8 flex items-center justify-center text-center bg-primary/5 border-primary/20"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <p className="text-xl">{formatAIResponse(currentCard.back)}</p>
            </Card>
          </motion.div>
        </div>

        <p className="text-center text-sm text-muted-foreground mb-6">Click the card to flip</p>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="lg" onClick={prevCard}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant={currentCard.mastered ? 'default' : 'outline'}
            size="lg"
            onClick={() => toggleMastered(currentCard.id)}
            className="gap-2"
          >
            <Check className="w-5 h-5" />
            {currentCard.mastered ? 'Mastered' : 'Mark Mastered'}
          </Button>
          <Button variant="outline" size="lg" onClick={nextCard}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  // Deck Detail View
  return (
    <div className="max-w-4xl mx-auto animate-in">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => setSelectedDeck(null)} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold">{selectedDeck.name}</h1>
          <p className="text-sm text-muted-foreground">
            {selectedDeck.cards.length} cards • {selectedDeck.cards.filter(c => c.mastered).length} mastered
          </p>
        </div>
        {selectedDeck.cards.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={shuffleCards} className="gap-2">
              <Shuffle className="w-4 h-4" />
              Shuffle
            </Button>
            <Button onClick={() => setStudyMode(true)} className="gap-2">
              <BookOpen className="w-4 h-4" />
              Study
            </Button>
          </div>
        )}
      </div>

      {/* AI Generator */}
      <Card className="p-5 mb-6 bg-gradient-to-r from-primary/5 to-emerald/5 border-primary/10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Flashcard Generator</h3>
        </div>
        <div className="flex gap-3">
          <Input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Enter a topic (e.g., 'Photosynthesis process')"
            className="flex-1"
          />
          <Button onClick={generateWithAI} disabled={generating} className="gap-2">
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Add Card Button */}
      <div className="flex justify-end mb-4">
        <Button onClick={() => setCardDialog({ open: true, front: '', back: '' })} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Card
        </Button>
      </div>

      {/* Cards List */}
      {selectedDeck.cards.length === 0 ? (
        <Card className="p-8 text-center">
          <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No cards yet. Add cards manually or use AI to generate them!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {selectedDeck.cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className={`p-4 ${card.mastered ? 'bg-emerald/5 border-emerald/20' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 grid gap-2 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Front</p>
                      <p className="font-medium">{formatAIResponse(card.front)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Back</p>
                      <p>{formatAIResponse(card.back)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => toggleMastered(card.id)}
                    >
                      <Check className={`w-4 h-4 ${card.mastered ? 'text-emerald' : ''}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setCardDialog({ open: true, front: card.front, back: card.back, edit: card.id })}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-ruby hover:text-ruby"
                      onClick={() => deleteCard(card.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Card Dialog */}
      <Dialog open={cardDialog.open} onOpenChange={(open) => setCardDialog({ ...cardDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cardDialog.edit ? 'Edit Card' : 'Add New Card'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="front">Front (Question/Term)</Label>
              <Textarea
                id="front"
                value={cardDialog.front}
                onChange={(e) => setCardDialog({ ...cardDialog, front: e.target.value })}
                placeholder="Enter the question or term"
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="back">Back (Answer/Definition)</Label>
              <Textarea
                id="back"
                value={cardDialog.back}
                onChange={(e) => setCardDialog({ ...cardDialog, back: e.target.value })}
                placeholder="Enter the answer or definition"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardDialog({ open: false, front: '', back: '' })}>Cancel</Button>
            <Button onClick={addCard}>{cardDialog.edit ? 'Update' : 'Add Card'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
