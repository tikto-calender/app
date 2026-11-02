# TikTo Frontend

Static frontend built with Vite and vanilla JavaScript. The production artifact is `dist/`, suitable for a private S3 bucket served through CloudFront.

## Local development

Run the backend on port `3000`, then:

```bash
npm install
npm run dev
```

Vite serves the UI at `http://localhost:5173` and proxies `/api/*` to `http://localhost:3000`.

## Production build

```bash
npm run build
```

Upload the generated `dist/` directory to S3. With one CloudFront distribution, route the default behavior to S3 and `/api/*` to the backend origin. Leave `VITE_API_ORIGIN` empty so requests remain same-origin.

Do not place secrets or AWS credentials in any `VITE_*` variable; those values are embedded in browser assets.

## CI/CD

Pull requests targeting `dev` or `main` run formatting, lint, unit tests, coverage and SonarQube analysis. Pushes to those branches repeat the quality gate, build the container, block HIGH/CRITICAL fixable vulnerabilities with Trivy, then push an immutable image to Amazon ECR.

Configure these GitHub organization or repository settings:

- Variable `AWS_BUILD_ROLE_ARN`: Terraform output `github_build_role_arn` from the shared stack.
- Variable `AWS_REGION`: `ap-southeast-2`.
- Variable `SONAR_HOST_URL`: URL of the SonarQube server.
- Secret `SONAR_TOKEN`: project analysis token.
