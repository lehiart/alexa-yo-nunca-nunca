const alexa = require('ask-sdk-core');
const questionsList = require('./constants');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const speechOutput = 'Bienvenido, di empezar para comenzar un nuevo juego o ayuda para oír las instrucciones';
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt('Di empezar o iniciar juego para comenzar un nuevo juego')
      .withSimpleCard('', speechOutput)
      .getResponse();
  },
};

const StartGameIntentHandler = {
  async canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    const gameData = await getGameData(handlerInput);

    return !gameData.inProgress && !gameData.category
      && (request.type === 'IntentRequest' && request.intent.name === 'StartGameIntent');
  },
  async handle(handlerInput) {
    await resetGame(handlerInput);
    const speechOutput = 'Nuevo juego, ¿Que categoría quieres?, ¿general o familiar?';

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt('Selecciona la categoría diciendo general o familiar')
      .withSimpleCard('', speechOutput)
      .getResponse();
  },
};

const StartOverHandler = {
  async canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;

    return (request.type === 'IntentRequest' && request.intent.name === 'AMAZON.StartOverIntent');
  },
  async handle(handlerInput) {
    await resetGame(handlerInput);

    const speechOutput = 'Nuevo juego, ¿Que categoría quieres?, ¿general o familiar?';

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt('Selecciona la categoría diciendo general o familiar')
      .withSimpleCard('', speechOutput)
      .getResponse();
  },
};

const AnswerCategoryIntentHandler = {
  async canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    const gameData = await getGameData(handlerInput);

    return !gameData.category && gameData.inProgress
      && (request.type === 'IntentRequest' && request.intent.name === 'AnswerCategoryIntent');
  },
  async handle(handlerInput) {
    const answer = handlerInput.requestEnvelope.request.intent.slots.category.value;
    const questions = questionsList[answer];

    await handlerInput.attributesManager.setSessionAttributes({
      inProgress: true, category: answer, questions, previous: {},
    });

    const question = await getRandomQuestion(handlerInput);
    let speechOutput = question;

    if (question.includes('Yo nunca')) {
      speechOutput = `${question}. <break time="3s"/> Di siguiente para avanzar a la próxima pregunta o repetir para escuchar de nuevo.` 
    }

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt('Di siguiente para avanzar a la próxima pregunta o repetir para escuchar esta pregunta de nuevo.')
      .withSimpleCard('', question)
      .getResponse();
  },
};

const NextIntentHandler = {
  async canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    const gameData = await getGameData(handlerInput);

    return gameData.inProgress && gameData.category
    && (request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NextIntent');
  },
  async handle(handlerInput) {
    const question = await getRandomQuestion(handlerInput);
    let speechOutput = question;

    if (question.includes('Yo nunca')) {
      speechOutput = `${question}. <break time="3s"/> ¿Siguiente o repetir?` 
    }

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt('Di siguiente para avanzar a la próxima pregunta o repetir para escuchar esta pregunta de nuevo')
      .withSimpleCard('', question)
      .getResponse();
  },
};

const RepeatIntentHandler = {
  async canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    const gameData = await getGameData(handlerInput);

    return gameData.inProgress && gameData.previous && gameData.category
     && (request.type === 'IntentRequest' && request.intent.name === 'AMAZON.RepeatIntent');
  },
  async handle(handlerInput) {
    const sessionAttributes = await handlerInput.attributesManager.getSessionAttributes();
    const { previous } = sessionAttributes;

    return handlerInput.responseBuilder
      .speak(`Yo nunca nunca, ${previous.question} <break time="1s"/>  Di siguiente para avanzar a la próxima pregunta o repetir para escuchar de nuevo.`)
      .reprompt('Di siguiente para avanzar a la próxima pregunta o repetir para escuchar esta pregunta de nuevo')
      .withSimpleCard('', `Yo nunca nunca, ${previous.question}`)
      .getResponse();
  },
};

/* HELPERS */

async function getRandomQuestion(handlerInput) {
  const sessionAttributes = await handlerInput.attributesManager.getSessionAttributes();
  const { questions } = sessionAttributes;

  if (questions.length) {
    const index = Math.floor(Math.random() * questions.length);
    const selected = questions[index];

    questions.splice(index, 1);
    handlerInput.attributesManager.setSessionAttributes({
      ...sessionAttributes, previous: selected, questions,
    });

    return `Yo nunca nunca, ${selected.question}`;
  }
  return 'Lo siento, ya no hay mas preguntas, empieza un juego nuevo';
}

const getSessionAttributesHelper = {
  async process(handlerInput) {
    const sessionAttributes = await handlerInput.attributesManager.getSessionAttributes();

    // Check if user is invoking the skill the first time and initialize preset values
    if (Object.keys(sessionAttributes).length === 0) {
      handlerInput.attributesManager.setSessionAttributes({
        inProgress: false, category: '', questions: [], previous: {},
      });
    }
  },
};

async function getGameData(handlerInput) {
  const sessionAttributes = await handlerInput.attributesManager.getSessionAttributes();
  return sessionAttributes;
}

function resetGame(handlerInput) {
  handlerInput.attributesManager.setSessionAttributes({
    inProgress: true, category: '', questions: [], previous: {},
  });
}

/* BUILT-IN INTENTS */

const HelpHandler = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Puedes iniciar diciendo empezar un nuevo juego, dentro del juego debes decir siguiente para avanzar a la próxima pregunta y repetir para volver a escucharla, ¿Cómo te puedo ayudar?')
      .reprompt('Puedes iniciar diciendo empezar un nuevo juego, dentro del juego debes decir siguiente para avanzar a la próxima pregunta y repetir para volver a escucharla, ¿Cómo te puedo ayudar?')
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;

    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent' || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Adios!')
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

const SystemExceptionHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'System.ExceptionEncountered';
  },
  handle(handlerInput) {
    console.log(`System exception encountered: ${handlerInput.requestEnvelope.request.reason}`);
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    const { request } = handlerInput.requestEnvelope;
    let speechError = 'Lo siento, por favor di una opción valida o abre la ayuda para ver las instrucciones';

    switch (request.intent.name) {
      case 'StartGameIntent':
      speechError = 'Ya hay un juego iniciado, si deseas uno nuevo di: empieza de nuevo'
      break;
      case 'AnswerCategoryIntent':
      speechError = 'Para seleccionar o cambiar una categoría debes comenzar un nuevo juego'
      break;
      case 'AMAZON.NextIntent':
      speechError = 'Debes iniciar un juego y seleccionar una categoría antes de avanzar entre preguntas'
      break;
      case 'AMAZON.RepeatIntent':
      speechError = 'La opción de repetir solo existe dentro de un juego iniciado'
      break;
      default:
        break;
    }

    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak(speechError)
      .reprompt('Lo siento, por favor di una opción valida o abre la ayuda para ver las instrucciones')
      .getResponse();
  },
};

const skillBuilder = alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    SystemExceptionHandler,
    SessionEndedRequestHandler,
    ExitHandler,
    HelpHandler,
    StartGameIntentHandler,
    AnswerCategoryIntentHandler,
    NextIntentHandler,
    StartOverHandler,
    RepeatIntentHandler,
  )
  .addRequestInterceptors(getSessionAttributesHelper)
  .addErrorHandlers(ErrorHandler)
  .lambda();
