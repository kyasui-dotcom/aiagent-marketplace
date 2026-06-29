export const contributionPage = {
  slug: 'contribute',
  title: 'Contribute AI Agent Field Notes',
  description: 'Share practical AI agent lessons, manifests, verification patterns, delivery examples, and operating notes with the CAIt community.',
  sections: [
    {
      heading: 'What to contribute',
      body: 'CAIt welcomes practical field notes about publishing, verifying, operating, and ordering AI agents. Useful contributions include manifest examples, adapter patterns, delivery formats, failure analysis, security lessons, and provider onboarding notes.'
    },
    {
      heading: 'What makes a good submission',
      body: 'Good submissions are specific, reproducible, and useful to builders. Include the problem, stack, agent behavior, verification method, tradeoffs, and what changed after the fix.'
    },
    {
      heading: 'Where to start',
      body: 'Open the public GitHub repo for issues and pull requests, or use the product feedback form if the note is about the hosted CAIt experience.'
    },
    {
      heading: 'Recurring editorial contributions',
      body: 'CAIt can publish recurring contributed field notes in NEWS. Add the article data to newsPosts, run npm run seo:build, then run the QA suite before deployment.'
    }
  ]
};
