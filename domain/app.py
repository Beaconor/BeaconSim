from gevent import monkey
monkey.patch_all()

import copy
import time
from threading import Thread
from flask import Flask, render_template, session, request
from flask.ext.socketio import SocketIO, emit, join_room, leave_room, \
    close_room, disconnect

app = Flask(__name__)
app.debug = True
app.config['SECRET_KEY'] = 'B3ac0nStr33t'
socketio = SocketIO(app)
thread = None

'''
def background_thread():
    # Example of how to send server generated events to clients.
    count = 0
'''    
    

@app.route('/')
def index():
    '''
    global thread
    if thread is None:
        thread = Thread(target=background_thread)
        thread.start()
    '''
    return render_template('index.html')

@app.route('/api', methods = ['POST', 'GET'])
def api():
    
    x = request.form['X']
    socketio.emit('response',
         {'data': x, 'count': 0}, namespace='/beaconsim')
    return str(x)





'''
@socketio.on('my broadcast event', namespace='/beaconsim')
def test_broadcast_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('response',
         {'data': message['data'], 'count': session['receive_count']},
         broadcast=True)



@socketio.on('leave', namespace='/beaconsim')
def leave(message):
    leave_room(message['room'])
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('response',
         {'data': 'In rooms: ' + ', '.join(request.namespace.rooms),
          'count': session['receive_count']})


@socketio.on('close room', namespace='/beaconsim')
def close(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('response', {'data': 'Room ' + message['room'] + ' is closing.',
                         'count': session['receive_count']},
         room=message['room'])
    close_room(message['room'])


@socketio.on('my room event', namespace='/beaconsim')
def send_room_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('response',
         {'data': message['data'], 'count': session['receive_count']},
         room=message['room'])
'''


@socketio.on('disconnect request', namespace='/beaconsim')
def disconnect_request():
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('response',
         {'data': 'Disconnected!', 'count': session['receive_count']})
    disconnect()


@socketio.on('connect', namespace='/beaconsim')
def test_connect():
    emit('response', {'data': 'Connected', 'count': 0})


@socketio.on('disconnect', namespace='/beaconsim')
def test_disconnect():
    print('Client disconnected')


if __name__ == '__main__':
    # for localhost:port only
    #socketio.run(app, port=5005)
    # for use on local network
    socketio.run(app, host='0.0.0.0', port=5005)
