from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from urllib.parse import urlparse

def sort_companies_and_locations(domain, org, gpe):
    # Parse the domain
    parsed_domain = urlparse(domain).netloc.split('.')[0]

    # Add domain to the org list
    texts = [parsed_domain] + org

    # Vectorize the texts
    vectorizer = TfidfVectorizer().fit_transform(texts)
    vectors = vectorizer.toarray()

    # Calculate cosine similarity
    cosine_matrix = cosine_similarity(vectors)

    # Extract similarity scores for domain vs org
    domain_similarity = cosine_matrix[0, 1:]

    # Sort company names and their corresponding GPEs by similarity score
    sorted_indices = [i for i, _ in sorted(enumerate(domain_similarity), key=lambda x: x[1], reverse=True)]
    sorted_org = [org[i] for i in sorted_indices]
    sorted_gpe = [gpe[i] if i < len(gpe) else '' for i in sorted_indices]

    # Combine sorted org and gpe into a list of strings
    sorted_companies_and_locations = [f"{o} {g}" for o, g in zip(sorted_org, sorted_gpe)]

    return sorted_companies_and_locations, org, gpe
