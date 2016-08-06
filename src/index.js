'use strict';

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

        if (event.session.application.applicationId !== "amzn1.ask.skill.0660da85-6b14-493d-9c5e-971569aab52b") {
            context.fail("Invalid Application ID");
        }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            var launchCallback = function(sessionAttributes, speechletResponse) {
                context.succeed(buildResponse(sessionAttributes, speechletResponse));
            };
            onLaunch(event.request,
                event.session,
                launchCallback);
        } else if (event.request.type === "IntentRequest") {
          console.log("handling IntentRequest");
            var intentCallback = function(sessionAttributes, speechletResponse) {
                context.succeed(buildResponse(sessionAttributes, speechletResponse));
            };
            onIntent(event.request,
                event.session,
                intentCallback);
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId);

    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
        + ", sessionId=" + session.sessionId);

    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
        + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // handle yes/no intent after the user has been prompted
    if (session.attributes && session.attributes.userPromptedToContinue) {
        delete session.attributes.userPromptedToContinue;
        if ("AMAZON.NoIntent" === intentName) {
            handleFinishSessionRequest(intent, session, callback);
        } else if ("AMAZON.YesIntent" === intentName) {
            handleRepeatRequest(intent, session, callback);
        }
    }

    // dispatch custom intents to handlers here
    if ("AnswerIntent" === intentName) {
      console.log("handling AnswerIntent");
        handleAnswerRequest(intent, session, callback);
    } else if ("DontKnowIntent" === intentName) {
        handleAnswerRequest(intent, session, callback);
    } else if ("AMAZON.YesIntent" === intentName) {
        handleAnswerRequest(intent, session, callback);
    } else if ("AMAZON.NoIntent" === intentName) {
        handleAnswerRequest(intent, session, callback);
    } else if ("AMAZON.StartOverIntent" === intentName) {
        getWelcomeResponse(callback);
    } else if ("AMAZON.RepeatIntent" === intentName) {
        handleRepeatRequest(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        handleGetHelpRequest(intent, session, callback);
    } else if ("AMAZON.StopIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else if ("AMAZON.CancelIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else {
      handleAnswerRequest(intent, session, callback);
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
        + ", sessionId=" + session.sessionId);

    // Add any cleanup logic here
}

// ------- Skill specific business logic -------

// Be sure to change this for your skill.
var CARD_TITLE = "Guess What I am";
var PROMPT = "Guess what I am";

function getWelcomeResponse(callback) {
    // Be sure to change this for your skill.
    var speechOutput = "Welcome to " + PROMPT + ". "
        + "I will become a thing or animal and you can ask questions to help you "
        + "identify what I am. Ask a question starting with the phrases 'do you' or "
        + "'are you' and I will let you know if your guess is associated with what I am. "
        + "Let's begin. " + PROMPT + ".",

    shouldEndSession = false,
    thingsAndAnimals = populateThingsAndAnimals(),
    sessionAttributes = buildSessionAttributes(thingsAndAnimals);

    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, PROMPT, shouldEndSession));
}

function buildSessionAttributes(thingsAndAnimals) {
  var currentAnswerIndex = Math.floor(Math.random() * (thingsAndAnimals.length - 0)) + 0;
  var potentialAnswers = [];

  for (var i = 0; i < thingsAndAnimals.length; i++) {
    potentialAnswers.push(thingsAndAnimals[i].key.toUpperCase());
  }

  return {
      "speechOutput": "Welcome. Lets play " + PROMPT + ". Take a guess by asking "
          + "using the phrases 'Do you' or 'Are you' before the guess.",
      "repromptText": PROMPT,
      "currentAnswerIndex": currentAnswerIndex,
      "thingsAndAnimals": thingsAndAnimals,
      "yesAnswers": thingsAndAnimals[currentAnswerIndex].values,
      "answer": thingsAndAnimals[currentAnswerIndex].key,
      "potentialAnswers": potentialAnswers
  };
}

function populateThingsAndAnimals() {
  return [
    { key: "Horse", values: ["legs","animal","alive","hoof","hooves","tail","farm"] },
    { key: "Chair", values: ["legs","4 legs","furniture","living room","room","house","sit","sit on it"] },
    { key: "Shovel", values: ["yard","metal","handle","dig","garage","tool"] },
    { key: "Belt", values: ["holes","leather","waist","clothing","clothes","wear"] },
    { key: "Dog", values: ["tail","legs","animal","alive","ears","paws","fur"] },
    { key: "Elephant", values: ["tail","legs","animal","alive","trunk","big","ears"] }
  ];
}

function handleAnswerRequest(intent, session, callback) {
    var sessionAttributes = session.attributes;
    var gameInProgress = session.attributes && session.attributes.thingsAndAnimals;
    var answerSlotValid = isAnswerSlotValid(intent);
    var dontKnow = intent.name === "DontKnowIntent";

    if (dontKnow) {
        var speechSorryOutput = "Sorry, I didn't understand your question.";

        callback(sessionAttributes,
            buildSpeechletResponse(CARD_TITLE, speechSorryOutput, PROMPT, false));
    } else if (!gameInProgress) {
        // If the user responded with an answer but there is no game in progress, ask the user
        // if they want to start a new game. Set a flag to track that we've prompted the user.
        sessionAttributes.userPromptedToContinue = true;
        var speechOutput = "There is no game in progress. Do you want to start a new "
            + "game of " + CARD_TITLE + "? ";

        callback(sessionAttributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
    } else {
        var thingsAndAnimals = session.attributes.thingsAndAnimals,
            repromptText = session.attributes.repromptText,
            yesAnswers = session.attributes.yesAnswers,
            guess,
            answer = session.attributes.answer,
            potentialAnswers = session.attributes.potentialAnswers;

        if (answerSlotValid && intent.slots.Answer) {
            guess = intent.slots.Answer.value;
        }

        var speechOutputAnalysis = "";

        if (!guess) {
            speechOutputAnalysis = "Sorry, I didn't understand your guess.";
        } else if (answerSlotValid && guess.toUpperCase() == answer.toUpperCase()) {
            speechOutputAnalysis = "You are correct. I am a " + answer + ". Good job! "
                + "Lets play another game. " + CARD_TITLE + ".";
            sessionAttributes = buildSessionAttributes(thingsAndAnimals);
        } else if (potentialAnswers.indexOf(guess.toUpperCase()) > -1) {
            speechOutputAnalysis = "I am not a " + guess + ". Please try again.";
        } else {
            if (session.attributes.yesAnswers.indexOf(guess) > -1) {
              speechOutputAnalysis = "Yes, your guess " + guess + " is associated with what I am. "
                  + "Ask another question or try to " + CARD_TITLE +  ".";
            } else {
              speechOutputAnalysis = "No, your guess " + guess + " is not associated with what I am. "
                  + "Ask another question or try to " + CARD_TITLE + ".";
            }
        }

        callback(sessionAttributes,
            buildSpeechletResponse(CARD_TITLE, speechOutputAnalysis, repromptText, false));
        }

}

function handleRepeatRequest(intent, session, callback) {
    // Repeat the previous speechOutput and repromptText from the session attributes if available
    // else start a new game session
    if (!session.attributes || !session.attributes.speechOutput) {
        getWelcomeResponse(callback);
    } else {
        callback(session.attributes,
            buildSpeechletResponseWithoutCard(session.attributes.speechOutput, session.attributes.repromptText, false));
    }
}

function handleGetHelpRequest(intent, session, callback) {
    // Do not edit the help dialogue. This has been created by the Alexa team to demonstrate best practices.

    var speechOutput = "To start a new game at any time, say, start new game. "
          + "Would you like to keep playing?",

        repromptText = "Try to guess what I am. "
          + "Would you like to keep playing?",

        shouldEndSession = false;

    callback(session.attributes,
        buildSpeechletResponseWithoutCard(speechOutput, repromptText, shouldEndSession));
}

function handleFinishSessionRequest(intent, session, callback) {
    // End the session with a custom closing statment when the user wants to quit the game
    callback(session.attributes,
        buildSpeechletResponseWithoutCard("Thanks for playing " + CARD_TITLE + "!", "", true));
}

function isAnswerSlotValid(intent) {
    var answerSlotFilled = intent.slots && intent.slots.Answer && intent.slots.Answer.value;
    return answerSlotFilled;
}

// ------- Helper functions to build responses -------


function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
