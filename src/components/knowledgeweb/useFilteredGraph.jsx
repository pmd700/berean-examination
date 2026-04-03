import { useMemo } from 'react';

// Compute cards within N steps from a focus card
function getNeighborhood(focusCardId, allCards, allConnections, depth) {
  const visited = new Set([focusCardId]);
  let frontier = new Set([focusCardId]);

  for (let step = 0; step < depth; step++) {
    const nextFrontier = new Set();
    for (const cardId of frontier) {
      for (const conn of allConnections) {
        if (conn.from_card_id === cardId && !visited.has(conn.to_card_id)) {
          nextFrontier.add(conn.to_card_id);
          visited.add(conn.to_card_id);
        }
        if (conn.to_card_id === cardId && !visited.has(conn.from_card_id)) {
          nextFrontier.add(conn.from_card_id);
          visited.add(conn.from_card_id);
        }
      }
    }
    frontier = nextFrontier;
  }

  return visited;
}

export default function useFilteredGraph(cards, connections, filters, focusState) {
  return useMemo(() => {
    let visibleCardIds = null; // null = all visible

    // Apply focus first
    if (focusState.active && focusState.cardId) {
      const neighborhood = getNeighborhood(focusState.cardId, cards, connections, focusState.depth);
      visibleCardIds = neighborhood;
    }

    // Apply type/tag filters
    const hasTypeFilter = filters.types && filters.types.length > 0;
    const hasTagFilter = filters.tags && filters.tags.length > 0;

    let filteredCards = cards;

    if (visibleCardIds) {
      filteredCards = filteredCards.filter(c => visibleCardIds.has(c.id));
    }

    if (hasTypeFilter) {
      filteredCards = filteredCards.filter(c => c.card_type && filters.types.includes(c.card_type));
    }

    if (hasTagFilter) {
      filteredCards = filteredCards.filter(c =>
        (c.tags || []).some(t => filters.tags.includes(t))
      );
    }

    const visibleSet = new Set(filteredCards.map(c => c.id));

    const filteredConnections = connections.filter(
      c => visibleSet.has(c.from_card_id) && visibleSet.has(c.to_card_id)
    );

    return { filteredCards, filteredConnections, visibleCardIds: visibleSet };
  }, [cards, connections, filters, focusState]);
}