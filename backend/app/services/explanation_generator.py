class ExplanationGenerator:

    @staticmethod
    def generate(claim, evidence, score):

        if not evidence:
            return (
                "No reliable supporting evidence was found "
                "for this claim."
            )

        top_sources = []

        for item in evidence[:3]:

            title = item.title.strip()

            if title and title not in top_sources:
                top_sources.append(title)

        if score >= 90:

            prefix = (
                "This claim is strongly supported by "
                "multiple authoritative sources."
            )

        elif score >= 75:

            prefix = (
                "This claim is supported by reliable "
                "independent sources."
            )

        elif score >= 60:

            prefix = (
                "This claim has moderate supporting "
                "evidence."
            )

        elif score >= 40:

            prefix = (
                "Only limited supporting evidence "
                "was found."
            )

        else:

            prefix = (
                "This claim could not be verified "
                "with confidence."
            )

        return (
            prefix
            + " Top evidence includes: "
            + ", ".join(top_sources)
            + "."
        )