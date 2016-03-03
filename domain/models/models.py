import math
from mongoengine import *
from lib import utils


class Color(EmbeddedDocument):
    r = FloatField(min_value=0, max_value=1)
    g = FloatField(min_value=0, max_value=1)
    b = FloatField(min_value=0, max_value=1)
    a = FloatField(min_value=0, max_value=1)
    
    def __init__(self, r=None, g=None, b=None, a=None, *args, **kwargs):
        super(EmbeddedDocument, self).__init__(*args, **kwargs)
        
        if r is None:
            r = 0.0
        self.r = r
        
        if g is None:
            g = 0.0
        self.g = g
        
        if b is None:
            b = 0.0
        self.b = b
        
        if a is None:
            a = 1.0
        self.a = a
        

class Position(EmbeddedDocument):
    x = FloatField()
    y = FloatField()
    z = FloatField()


class Bulb(EmbeddedDocument):
    id = IntField(min_value=0)
    pos = EmbeddedDocumentField(Position)
    latitude = FloatField(min_value=0, max_value=1)
    longitude = FloatField()
    color = EmbeddedDocumentField(Color)
    
    
class BeaconFeed(Document):
    title = StringField()
    bulbs = ListField(EmbeddedDocumentField(Bulb))
    
    def __init__(self, title=None, *args, **kwargs):
        super(Document, self).__init__(*args, **kwargs)
        
        if title is None:
            title = ""
        self.title = title
        
        self.initBulbs()
        
    
    def initBulbs(self):
        self.bulbs = []
        
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
            latPct = iRow / (bulbRows-1) # 0 -> 1
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
                self.bulbs.append(bulb)
            
        
        
    