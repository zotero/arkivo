BIN = ./node_modules/.bin

SRC = lib/*.js lib/**/*.js
TEST = test/*.js test/**/*.js

doc:
	${BIN}/yuidoc .

lint:
	@${BIN}/jshint --verbose ${SRC} ${TEST} ./bin/*.js

test: lint
	@${BIN}/mocha --harmony-generators ${TEST}

debug:
	@${BIN}/mocha --harmony-generators debug ${TEST}

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
