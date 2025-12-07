import { useState, useEffect } from 'react';
import { flashcardAPI } from './services/flashcardAPI';

function AdminPanel({ onBack, onCategoriesChanged }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isProd = import.meta.env.MODE === 'production';
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = host.includes('localhost') || host.startsWith('127.');
  const isReadOnly = isProd && !isLocal;
  
  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newFlashcard, setNewFlashcard] = useState({ front: '', back: '', backFormat: 'sentence' });
  const [editingCard, setEditingCard] = useState(null);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load flashcards when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      loadFlashcards();
    } else {
      setFlashcards([]);
    }
  }, [selectedCategoryId]);

  const loadCategories = async () => {
    try {
      const categoriesData = await flashcardAPI.fetchCategories();
      setCategories(categoriesData);
    } catch (err) {
      setError('Failed to load categories: ' + err.message);
    }
  };

  const loadFlashcards = async () => {
    try {
      setLoading(true);
      const flashcardsData = await flashcardAPI.fetchFlashcardsByCategory(
        categories.find(cat => cat.id == selectedCategoryId)?.name
      );
      setFlashcards(flashcardsData);
    } catch (err) {
      setError('Failed to load flashcards: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (isReadOnly) { setError('Read-only on production. Edit locally, then redeploy.'); return; }

    try {
      await flashcardAPI.createCategory(newCategoryName);
      setNewCategoryName('');
      await loadCategories();
      if (onCategoriesChanged) onCategoriesChanged(await flashcardAPI.fetchCategories());
    } catch (err) {
      setError('Failed to create category: ' + err.message);
    }
  };

  const handleCreateFlashcard = async (e) => {
    e.preventDefault();
    if (!selectedCategoryId || !newFlashcard.front.trim() || !newFlashcard.back.trim()) return;
    if (isReadOnly) { setError('Read-only on production. Edit locally, then redeploy.'); return; }

    try {
      await flashcardAPI.createFlashcard(selectedCategoryId, newFlashcard.front, newFlashcard.back, newFlashcard.backFormat);
      setNewFlashcard({ front: '', back: '', backFormat: 'sentence' });
      loadFlashcards();
    } catch (err) {
      setError('Failed to create flashcard: ' + err.message);
    }
  };

  const handleUpdateFlashcard = async (e) => {
    e.preventDefault();
    if (!editingCard) return;
    if (isReadOnly) { setError('Read-only on production. Edit locally, then redeploy.'); return; }

    try {
      await flashcardAPI.updateFlashcard(editingCard.id, editingCard.front, editingCard.back, editingCard.back_format);
      setEditingCard(null);
      loadFlashcards();
    } catch (err) {
      setError('Failed to update flashcard: ' + err.message);
    }
  };

  const handleDeleteFlashcard = async (id) => {
    if (!confirm('Are you sure you want to delete this flashcard?')) return;
    if (isReadOnly) { setError('Read-only on production. Edit locally, then redeploy.'); return; }

    try {
      await flashcardAPI.deleteFlashcard(id);
      loadFlashcards();
    } catch (err) {
      setError('Failed to delete flashcard: ' + err.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Are you sure you want to delete this category and all its flashcards?')) return;
    if (isReadOnly) { setError('Read-only on production. Edit locally, then redeploy.'); return; }

    try {
      await flashcardAPI.deleteCategory(id);
      if (selectedCategoryId == id) {
        setSelectedCategoryId('');
      }
      await loadCategories();
      if (onCategoriesChanged) onCategoriesChanged(await flashcardAPI.fetchCategories());
    } catch (err) {
      setError('Failed to delete category: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Panel */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold text-indigo-700">Flashcards Admin Panel</h1>
            <div className="flex gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
                >
                  Back to Flashcards
                </button>
              )}
              {!(typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.startsWith('127.')) ) && (
                <button
                  onClick={async () => { try { await flashcardAPI.logout(); } catch(_){} if (onBack) onBack(); }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {isProd && !isLocal && (
          <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 text-yellow-900 p-3 text-sm">
            Read-only mode on production; make changes locally and redeploy.
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button 
              onClick={() => setError(null)}
              className="float-right text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categories Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Categories</h2>
            
            {/* Add Category Form */}
            <form onSubmit={handleCreateCategory} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isReadOnly}
                  title={isReadOnly ? 'Read-only on production' : ''}
                  className={`px-4 py-2 rounded-md text-white ${isReadOnly ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  Add
                </button>
              </div>
            </form>

            {/* Categories List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                    selectedCategoryId == category.id
                      ? 'bg-indigo-100 border border-indigo-300'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span 
                    onClick={() => setSelectedCategoryId(category.id)}
                    className="flex-1"
                  >
                    {category.name}
                  </span>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    disabled={isReadOnly}
                    title={isReadOnly ? 'Read-only on production' : ''}
                    className={`px-2 ${isReadOnly ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Flashcards Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Flashcards
              {selectedCategoryId && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({categories.find(cat => cat.id == selectedCategoryId)?.name})
                </span>
              )}
            </h2>

            {selectedCategoryId ? (
              <>
                {/* Add Flashcard Form */}
                <form onSubmit={handleCreateFlashcard} className="mb-4 space-y-2">
                  <textarea
                    value={newFlashcard.front}
                    onChange={(e) => setNewFlashcard({...newFlashcard, front: e.target.value})}
                    placeholder="Front side"
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Back side format:</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="backFormat"
                          value="sentence"
                          checked={newFlashcard.backFormat === 'sentence'}
                          onChange={(e) => setNewFlashcard({...newFlashcard, backFormat: e.target.value})}
                          className="mr-2"
                        />
                        <span className="text-sm">Sentence</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="backFormat"
                          value="list"
                          checked={newFlashcard.backFormat === 'list'}
                          onChange={(e) => setNewFlashcard({...newFlashcard, backFormat: e.target.value})}
                          className="mr-2"
                        />
                        <span className="text-sm">List</span>
                      </label>
                    </div>
                  </div>
                  
                  <textarea
                    value={newFlashcard.back}
                    onChange={(e) => setNewFlashcard({...newFlashcard, back: e.target.value})}
                    placeholder={newFlashcard.backFormat === 'list' ? 'Back side (separate items with new lines, semicolons, or pipes)' : 'Back side'}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  
                  {newFlashcard.backFormat === 'list' && (
                    <div className="text-xs text-gray-500">
                      💡 Tip: Separate list items using new lines, semicolons (;), or pipes (|)
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isReadOnly}
                    title={isReadOnly ? 'Read-only on production' : ''}
                    className={`w-full px-4 py-2 rounded-md text-white ${isReadOnly ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    Add Flashcard
                  </button>
                </form>

                {/* Flashcards List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="text-center text-gray-500">Loading flashcards...</div>
                  ) : flashcards.length === 0 ? (
                    <div className="text-center text-gray-500">No flashcards in this category</div>
                  ) : (
                    flashcards.map((card) => (
                      <div key={card.id} className="border border-gray-200 rounded p-3">
                        {editingCard?.id === card.id ? (
                          <form onSubmit={handleUpdateFlashcard} className="space-y-2">
                            <textarea
                              value={editingCard.front}
                              onChange={(e) => setEditingCard({...editingCard, front: e.target.value})}
                              rows="2"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            
                            <div className="space-y-1">
                              <label className="block text-xs font-medium text-gray-700">Format:</label>
                              <div className="flex space-x-3">
                                <label className="flex items-center">
                                  <input
                                    type="radio"
                                    name="editBackFormat"
                                    value="sentence"
                                    checked={editingCard.back_format === 'sentence'}
                                    onChange={(e) => setEditingCard({...editingCard, back_format: e.target.value})}
                                    className="mr-1"
                                  />
                                  <span className="text-xs">Sentence</span>
                                </label>
                                <label className="flex items-center">
                                  <input
                                    type="radio"
                                    name="editBackFormat"
                                    value="list"
                                    checked={editingCard.back_format === 'list'}
                                    onChange={(e) => setEditingCard({...editingCard, back_format: e.target.value})}
                                    className="mr-1"
                                  />
                                  <span className="text-xs">List</span>
                                </label>
                              </div>
                            </div>
                            
                            <textarea
                              value={editingCard.back}
                              onChange={(e) => setEditingCard({...editingCard, back: e.target.value})}
                              placeholder={editingCard.back_format === 'list' ? 'Separate items with new lines, semicolons, or pipes' : 'Back side'}
                              rows="3"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={isReadOnly}
                                title={isReadOnly ? 'Read-only on production' : ''}
                                className={`px-3 py-1 rounded text-sm text-white ${isReadOnly ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCard(null)}
                                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="text-sm font-medium mb-1">Front:</div>
                            <div className="text-sm text-gray-700 mb-2">{card.front}</div>
                            
                            <div className="text-sm font-medium mb-1">
                              Back: 
                              <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                                {card.back_format || 'sentence'}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-700 mb-2">
                              {(card.back_format === 'list') ? (
                                <div className="pl-2">
                                  {card.back.split(/[\n;|]/).filter(item => item.trim()).map((item, index) => (
                                    <div key={index} className="flex items-start mb-1">
                                      <span className="text-gray-500 mr-2">•</span>
                                      <span>{item.trim()}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                card.back
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingCard(card)}
                                disabled={isReadOnly}
                                title={isReadOnly ? 'Read-only on production' : ''}
                                className={`px-3 py-1 rounded text-sm text-white ${isReadOnly ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteFlashcard(card.id)}
                                disabled={isReadOnly}
                                title={isReadOnly ? 'Read-only on production' : ''}
                                className={`px-3 py-1 rounded text-sm text-white ${isReadOnly ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Select a category to manage flashcards
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;