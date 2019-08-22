publish:
	npm publish --dry-run

install:
	npm link

lint:
	npm run eslint .

build:
	rm -rf dist
	NODE_ENV=development npx webpack
	cp CNAME dist/
	mkdir dist/img
	cp img/businessman.png dist/img/businessman.png
