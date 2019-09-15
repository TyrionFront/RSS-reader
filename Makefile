publish:
	npm publish --dry-run

install:
	npm link

lint:
	npx eslint .

build:
	rm -rf dist
	NODE_ENV=development npx webpack
