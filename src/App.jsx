import { useState, useEffect } from "react";
import Flashcard from "./Flashcard";
import DomainSelect from "./DomainSelect";
import AdminPanel from "./AdminPanel";
import Login from "./Login";
import { flashcardAPI } from "./services/flashcardAPI";

function App() {
  const [categories, setCategories] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('flashcards'); // 'flashcards' | 'login' | 'admin'

  // Load categories on initial render
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const categoriesData = await flashcardAPI.fetchCategories();
        setCategories(categoriesData);
      } catch (err) {
        console.error('Failed to load categories:', err);
        setError('Failed to load categories. Make sure the server is running.');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // When domain changes, load its data
  useEffect(() => {
    const loadFlashcards = async () => {
      if (selectedDomain) {
        try {
          setLoading(true);
          const flashcardsData = await flashcardAPI.fetchFlashcardsByCategory(selectedDomain);
          setCards(flashcardsData);
          setIndex(0);
          setFlipped(false);
        } catch (err) {
          console.error('Failed to load flashcards:', err);
          setError('Failed to load flashcards for this category.');
        } finally {
          setLoading(false);
        }
      }
    };

    loadFlashcards();
  }, [selectedDomain]);

  const nextCard = () => {
    setIndex((prev) => (prev + 1) % cards.length);
    setFlipped(false);
  };

  const prevCard = () => {
    setIndex((prev) => (prev - 1 + cards.length) % cards.length);
    setFlipped(false);
  };

  if (loading && currentView === 'flashcards') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white flex flex-col items-center justify-center p-6">
        <div className="text-xl text-indigo-700">Loading...</div>
      </div>
    );
  }

  if (error && currentView === 'flashcards') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white flex flex-col items-center justify-center p-6">
        <div className="text-xl text-red-600 mb-4">{error}</div>
        <div className="text-sm text-gray-600 mb-4">
          Make sure to run: <code className="bg-gray-200 px-2 py-1 rounded">npm run server</code>
        </div>
        <button
          onClick={() => setCurrentView('admin')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Go to Admin Panel
        </button>
      </div>
    );
  }

  if (currentView === 'login') {
    return <Login onSuccess={() => setCurrentView('admin')} onCancel={() => setCurrentView('flashcards')} />;
  }

  if (currentView === 'admin') {
    return (
      <AdminPanel 
        onBack={() => setCurrentView('flashcards')}
        onCategoriesChanged={(updated) => setCategories(updated)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white">
      {/* Top Navigation Panel */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold text-indigo-700">
              Flashcards
            </h1>
            <button
              onClick={() => setCurrentView('login')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
            >
              Admin Panel
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center p-6">
        <DomainSelect 
        domains={categories.map(cat => cat.name)} 
        onSelect={setSelectedDomain} 
      />

      {cards.length > 0 && (
        <>
          <div className="text-sm text-gray-600 mb-4">
            Card {index + 1} of {cards.length}
          </div>
          <Flashcard
            front={cards[index].front}
            back={cards[index].back}
            backFormat={cards[index].back_format || 'sentence'}
            flipped={flipped}
            onFlip={() => setFlipped(!flipped)}
          />
          <div className="flex gap-4 mt-4">
            <button 
              onClick={prevCard} 
              className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-md">
              Previous
            </button>
            <button 
              onClick={nextCard} 
              className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-md">
              Next
            </button>
          </div>
        </>
      )}

        {selectedDomain && cards.length === 0 && !loading && (
          <div className="text-gray-600 mt-8">
            No flashcards found for "{selectedDomain}"
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
