publish:
	npm publish --dry-run

install:
	npm link

lint:
	npm run eslint .

build:
	rm -rf dist
	NODE_ENV=production npx webpack
