import { useState, useEffect, useCallback } from 'react';
import { flashcardAPI } from '../../services/api';

// Deck list (all, or scoped to a subject).
export function useDecks(subjectId) {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setDecks(subjectId ? await flashcardAPI.getDecksForSubject(subjectId) : await flashcardAPI.getDecks());
    } catch {
      setDecks([]);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createDeck = useCallback(async (d) => { const r = await flashcardAPI.createDeck(d); await refresh(); return r.id; }, [refresh]);
  const deleteDeck = useCallback(async (id) => { await flashcardAPI.deleteDeck(id); await refresh(); }, [refresh]);

  return { decks, loading, refresh, createDeck, deleteDeck };
}

// One deck + its cards, with card mutations + SRS review.
export function useDeck(deckId) {
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!deckId) return;
    setLoading(true);
    try {
      setDeck(await flashcardAPI.getDeck(deckId));
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load deck');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => { refresh(); }, [refresh]);

  const addCard = useCallback(async (d) => { await flashcardAPI.addCard(deckId, d); await refresh(); }, [deckId, refresh]);
  const updateCard = useCallback(async (cardId, d) => { await flashcardAPI.updateCard(cardId, d); await refresh(); }, [refresh]);
  const deleteCard = useCallback(async (cardId) => { await flashcardAPI.deleteCard(cardId); await refresh(); }, [refresh]);
  const reviewCard = useCallback(async (cardId, correct) => { await flashcardAPI.reviewCard(cardId, correct); await refresh(); }, [refresh]);

  return { deck, loading, error, refresh, addCard, updateCard, deleteCard, reviewCard };
}
