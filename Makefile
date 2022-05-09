YAMLS := $(wildcard quizzes/*.yml)
JSONS := $(YAMLS:yml=json)

all: $(JSONS)

quizzes/%.json: quizzes/%.yml
	cat $< | y2j > $@
