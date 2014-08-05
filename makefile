BIN = ./node_modules/.bin

SRC = lib/*.js
TEST = test/*.js

doc:
	${BIN}/yuidoc .

lint:
	@${BIN}/eslint --reset --eslintrc ${SRC}

test:
	@${BIN}/mocha --harmony-generators ${TEST}

debug:
	@${BIN}/mocha debug --harmony-generators ${TEST}

test-travis:
	@node --harmony-generators \
		${BIN}/istanbul cover ${BIN}/_mocha --report-lcovonly -- ${TEST}

spec:
	@${BIN}/mocha --harmony-generators --reporter spec ${TEST}

coverage: clean
	@node --harmony-generators \
		${BIN}/istanbul cover ${BIN}/_mocha -- ${TEST}

clean:
	@rm -rf ./coverage
	@rm -rf ./doc

.PHONY: lint doc clean test debug test-travis spec watch coverage
