from __future__ import print_function
import sys

import math
from mongoengine import *
from lib import utils


class Color(EmbeddedDocument):
    r = FloatField(min_value=0, max_value=1, default=0.0)
    g = FloatField(min_value=0, max_value=1, default=0.0)
    b = FloatField(min_value=0, max_value=1, default=0.0)
    a = FloatField(min_value=0, max_value=1, default=1.0)
        

class Position(EmbeddedDocument):
    x = FloatField(required=True)
    y = FloatField(required=True)
    z = FloatField(required=True)


class Bulb(EmbeddedDocument):
    id = IntField(min_value=0, required=True)
    pos = EmbeddedDocumentField(Position, required=True)
    latitude = FloatField() #FloatField(min_value=0, max_value=1)
    longitude = FloatField()
    color = EmbeddedDocumentField(Color)
    

class DefaultBulbs():
    @staticmethod
    def initBulbs():
        defaultBulbs = []
        
        unit = 0.8;
        bulbRows = 12;
        poleR = 1 * unit; # radius of end caps
        equatorR = 4.5 * unit;
        curveExp = 0.6;
        
        rOffset = 0
        
        bulbId = 0
        
        twoPI = 2 * math.pi
        '''
        rowBulbsNum
        rowRad # row radius
        
        latPct
        lat
        equatorPct
        rUnit
        
        x, y, z
        r # rotation radians 
        
        iRow
        iBulb
        '''
        for iRow in range(0, bulbRows):
            latPct = iRow / float(bulbRows-1) # 0 -> 1 | also note the "float" that's a fun bug in python 2.x 
            
            lat = (latPct * 2) - 1 # -1 -> 0 -> 1
            equatorPct = 1 - abs( lat ) # 0 -> 1 -> 0
            equatorPct = math.pow(equatorPct, curveExp) # give the thing some roundness 
            rowRad = utils.lerp(poleR, equatorR, equatorPct)
            rowBulbsNum = int( math.floor( (twoPI*rowRad)/unit ) )
            
            rUnit = twoPI / rowBulbsNum
            
            # alternating rows are rotated an additional half-segment width so the oranges stack better
            if rOffset == 0:
                rOffset = rUnit * 0.5
            else:
                rOffset = 0
            
            for iBulb in range(0, rowBulbsNum):
                y = lat * ((bulbRows-1) * 0.5) * unit
                r = rUnit * iBulb + rOffset
                
                x = math.sin(r) * rowRad
                z = math.cos(r) * rowRad
                
                pos = Position(x=x, y=y, z=z)
                color = Color()
                
                bulb = Bulb(id=bulbId, pos=pos, latitude=latPct, longitude=r, color=color)
                #bulb.pos.x = x
                #bulb.pos.y = y
                #bulb.pos.z = z
                bulbId += 1
                defaultBulbs.append(bulb)
            
        
        return defaultBulbs
    
    
class BeaconFeed(Document):
    title = StringField(required=True, unique=True)
    bulbs = ListField(EmbeddedDocumentField(Bulb), default=DefaultBulbs.initBulbs())
    
    '''
    def __init__(self, title=None, *args, **kwargs):
        super(Document, self).__init__(*args, **kwargs)
        
        if title is None:
            title = ""
        self.title = title
        
        self.initBulbs()
   '''     
    
        
    