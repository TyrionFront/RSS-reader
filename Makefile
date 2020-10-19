publish:
	npm publish --dry-run

install:
	npm link

lint:
	npx eslint .

build:
	sudo rm -rf dist
	NODE_ENV=development npx webpack

deploy:
	surge dist/
