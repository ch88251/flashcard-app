describe('Viewing flashcards', () => {
  const baseUrl = 'http://localhost:3000';

  it('let\'s me view flash cards', () => {
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
});
