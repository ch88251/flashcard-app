describe('Flashcard subject dropdown', () => {
  const baseUrl = 'https://flashcard-app-five-weld.vercel.app';

  it('shows correct number of subjects and allows selection', () => {
    cy.visit(baseUrl);

    // Locate the dropdown
    cy.get('[data-testid="subject-select"]')
      .should('be.visible');

    // Verify number of options
    cy.get('[data-testid="subject-select"] option')
      .should('have.length', 11); // adjust if needed

    // Verify specific options exist
    cy.get('[data-testid="subject-select"]')
      .contains('Docker')
      .should('exist');

    // Select an option
    cy.get('[data-testid="subject-select"]')
      .select('Docker')
      .should('have.value', 'docker'); // value attribute
  });
});
