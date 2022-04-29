# Kraphoot

It's like Kahoot™ but not really.

Based on: https://jmcker.github.io/Peer-to-Peer-Cue-System it was trivial to implement a student-teacher broadcast type system which handles:

- "quiz questions" defined on the server side
- Students joining a teacher's session
- The teacher able to send the questions to the student's views, and let them choose an answer.
- Results view


## Features

- [x] JSON/YAML structured quizes
- [x] Sending questions to students
- [x] Receiving their answers
- [ ] Self-entered names
- [ ] Leaderboard
- [ ] Media on the questions/slides.
- [ ] Showing correct answer student side.
- [ ] Any sense of aesthetics

Question types:

- [x] choose-1
- [ ] choose-many
- [ ] true/false (choose-1 sub-case)
- [ ] poll (instant live results)
- [ ] fastcups (poll sub-case)