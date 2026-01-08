describe('Flashcard subject dropdown', () => {
  const baseUrl = 'http://localhost:3000';

  it('let\'s me select a subject', () => {
    cy.visit(baseUrl);

    // Locate the dropdown
    cy.get('[data-testid="subject-select"]')
      .should('be.visible');

    // Verify specific options exist
    cy.get('[data-testid="subject-select"]')
      .contains('Docker')
      .should('exist');

    // Select an option
    cy.get('[data-testid="subject-select"]')
      .select('Docker')
      .should('have.value', 'Docker');
  });

  it('creates a new subject in admin panel and verifies it appears in dropdown', () => {
    cy.visit(baseUrl);

    // Navigate to admin panel
    cy.contains('Admin Panel').click();

    // Wait for admin panel to load
    cy.contains('Flashcards Admin Panel').should('be.visible');

    // Enter new category name
    cy.get('input[placeholder="New category name"]')
      .type('History');

    // Click Add button to create the category
    cy.contains('button', 'Add').click();

    // Verify the category was added to the list
    cy.contains('History').should('be.visible');

    // Navigate back to flashcards page
    cy.contains('Back to Flashcards').click();

    // Verify the new subject appears in the dropdown
    cy.get('[data-testid="subject-select"]')
      .should('be.visible')
      .contains('History')
      .should('exist');

    // Verify we can select the new subject
    cy.get('[data-testid="subject-select"]')
      .select('History')
      .should('have.value', 'History');
  });
});
